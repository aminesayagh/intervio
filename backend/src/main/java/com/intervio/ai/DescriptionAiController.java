package com.intervio.ai;

import com.intervio.api.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import tools.jackson.databind.json.JsonMapper;

/**
 * The description's AI (decision 153): the person's instruction about the selection, or
 * the whole text, answered by OpenAI and streamed back as the AI SDK's UI message stream,
 * which the editor's chat reads as it comes. The model, the system prompt and the length
 * limit are set here; the browser only sends the instruction and the text.
 */
@RestController
class DescriptionAiController {

	private static final Logger log = LoggerFactory.getLogger(DescriptionAiController.class);

	/** The longest description (and selection) sent, in characters. */
	static final int MAX_TEXT = 20_000;

	static final int MAX_PROMPT = 2_000;

	static final String EDIT = """
			You edit part of a description in a maintenance and contracting application.
			Rewrite the selected text as the instruction asks. Answer with the replacement text only:
			no introduction, no quotes, no comment. Keep its formatting (bold, italic, lists, links)
			in Markdown, and write in the language of the text unless the instruction asks otherwise.""";

	static final String GENERATE = """
			You help write a description in a maintenance and contracting application.
			Write what the instruction asks, to be added to the description. Answer with that text
			only: no introduction, no comment. Use Markdown for formatting, and write in the language
			of the description (or of the instruction when the description is empty).""";

	private final ChatClient chat;

	private final AiLimiter limiter;

	private final JsonMapper json;

	private final boolean enabled;

	DescriptionAiController(ChatClient.Builder chat, AiLimiter limiter, JsonMapper json,
			@Value("${app.ai.api-key}") String apiKey) {
		this.chat = chat.build();
		this.limiter = limiter;
		this.json = json;
		this.enabled = !apiKey.isBlank();
	}

	/** One part of a message, as the AI SDK sends it; only text parts are read. */
	record Part(String type, String text) {
	}

	record Message(String role, List<Part> parts) {
	}

	/** The description and the selection, as Markdown (the selection is null to write new text). */
	record Context(@NotNull @Size(max = MAX_TEXT) String document, @Size(max = MAX_TEXT) String selection) {
	}

	record Ask(@NotEmpty List<Message> messages, @NotNull @Valid Context ctx) {
	}

	@PostMapping("/api/ai/description")
	ResponseEntity<Flux<ServerSentEvent<String>>> ask(@Valid @RequestBody Ask ask, Authentication authentication) {
		if (!enabled) {
			throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ERROR_AI_UNAVAILABLE");
		}
		String prompt = instruction(ask.messages());
		if (prompt.isBlank() || prompt.length() > MAX_PROMPT) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_VALIDATION");
		}
		if (!limiter.allow(authentication.getName())) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ERROR_AI_LIMIT");
		}
		Context ctx = ask.ctx();
		boolean editing = ctx.selection() != null && !ctx.selection().isBlank();
		String user = editing
				? "Description:\n<<<\n%s\n>>>\n\nSelected text:\n<<<\n%s\n>>>\n\nInstruction: %s".formatted(ctx.document(),
						ctx.selection(), prompt)
				: "Description:\n<<<\n%s\n>>>\n\nInstruction: %s".formatted(ctx.document(), prompt);
		Flux<ChatResponse> answer = chat.prompt().system(editing ? EDIT : GENERATE).user(user).stream().chatResponse();
		return ResponseEntity.ok()
			.contentType(MediaType.TEXT_EVENT_STREAM)
			.header("x-vercel-ai-ui-message-stream", "v1")
			.body(stream(answer, authentication.getName()));
	}

	/** The last message's text: the frontend sends one question at a time. */
	private static String instruction(List<Message> messages) {
		Message last = messages.get(messages.size() - 1);
		if (last.parts() == null) {
			return "";
		}
		return String.join("", last.parts()
			.stream()
			.filter(p -> "text".equals(p.type()) && p.text() != null)
			.map(Part::text)
			.toList()).trim();
	}

	/**
	 * The model's streamed answer as the AI SDK's UI message stream: start, the text in
	 * deltas, finish, then [DONE]. A failure midway ends it with an error chunk whose text is
	 * a code, never a message (the frontend says what went wrong).
	 */
	Flux<ServerSentEvent<String>> stream(Flux<ChatResponse> answer, String person) {
		AtomicReference<Usage> usage = new AtomicReference<>();
		Flux<Map<String, String>> deltas = answer.doOnNext(r -> {
			if (r.getMetadata() != null && r.getMetadata().getUsage() != null
					&& r.getMetadata().getUsage().getTotalTokens() != null
					&& r.getMetadata().getUsage().getTotalTokens() > 0) {
				usage.set(r.getMetadata().getUsage());
			}
		})
			.filter(r -> r.getResult() != null && r.getResult().getOutput().getText() != null
					&& !r.getResult().getOutput().getText().isEmpty())
			.map(r -> Map.of("type", "text-delta", "id", "answer", "delta", r.getResult().getOutput().getText()));
		Flux<Map<String, String>> chunks = Flux
			.concat(Flux.just(Map.<String, String>of("type", "start"), Map.of("type", "text-start", "id", "answer")),
					deltas, Flux.just(Map.of("type", "text-end", "id", "answer"), Map.of("type", "finish")))
			.doOnComplete(() -> {
				Usage u = usage.get();
				// Usage, to follow the cost (no text of the description is logged).
				log.info("AI description answer for {}: {} prompt tokens, {} completion tokens", person,
						u == null ? "?" : u.getPromptTokens(), u == null ? "?" : u.getCompletionTokens());
			})
			.onErrorResume(e -> {
				log.warn("AI description answer failed for {}", person, e);
				return Flux.just(Map.of("type", "error", "errorText", "ERROR_AI_FAILED"));
			});
		return chunks.map(this::event).concatWith(Flux.just(ServerSentEvent.builder("[DONE]").build()));
	}

	private ServerSentEvent<String> event(Map<String, String> chunk) {
		return ServerSentEvent.builder(json.writeValueAsString(chunk)).build();
	}

}
