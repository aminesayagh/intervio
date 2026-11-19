package com.intervio.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends the email links in the user's language (spec section 8): an HTML email with the Intervio
 * logo (embedded, as email apps cannot fetch protected files), and the same text as plain text.
 */
@Component
class AuthMailer {

	private static final ClassPathResource LOGO = new ClassPathResource("mail/logo.png");

	private static final String TEMPLATE = read("mail/email.html");

	private final JavaMailSender sender;

	private final AuthProperties props;

	AuthMailer(JavaMailSender sender, AuthProperties props) {
		this.sender = sender;
		this.props = props;
	}

	/** The texts of one email. */
	record Content(String subject, String intro, String button, String note) {
	}

	/** A link email; an email-change link goes to the new address. */
	void send(User user, EmailLink link, String token) {
		boolean fr = user.getLocale() == User.LOCALE_FR;
		String url = props.frontendUrl() + "/auth/link?token=" + token;
		String to = link == EmailLink.CHANGE_EMAIL ? user.getPendingEmail() : user.getEmail();
		deliver(user, to, content(link, fr), url);
	}

	/** Tells the current address that the email is changing (decision 88); no button. */
	void sendEmailChangeNotice(User user) {
		boolean fr = user.getLocale() == User.LOCALE_FR;
		Content c = fr ? new Content("Votre adresse e-mail Intervio va changer",
				"Le changement de l'adresse e-mail de votre compte vers " + user.getPendingEmail()
						+ " a été demandé. Votre adresse actuelle reste active jusqu'à la confirmation de la nouvelle.",
				"", "Si vous n'êtes pas à l'origine de cette demande, connectez-vous et annulez le changement dans les paramètres.")
				: new Content("Your Intervio email is changing",
						"A change of your account email to " + user.getPendingEmail()
								+ " was requested. Your current email stays active until the new one is confirmed.",
						"", "If you did not ask for this, log in and cancel the change in Settings.");
		deliver(user, user.getEmail(), c, null);
	}

	private void deliver(User user, String to, Content c, String url) {
		boolean fr = user.getLocale() == User.LOCALE_FR;
		String greeting = (fr ? "Bonjour " : "Hello ") + user.getFullName() + ",";
		String footer = fr ? "Cet e-mail a été envoyé par Intervio." : "This email was sent by Intervio.";
		String action = url == null ? "" : c.button() + (fr ? " : " : ": ") + url + "\n\n";
		String plain = greeting + "\n\n" + c.intro() + "\n\n" + action + c.note() + "\n";
		String html = fill(Map.of("lang", fr ? "fr" : "en", "subject", c.subject(), "greeting", greeting, "intro",
				c.intro(), "button", c.button(), "url", url == null ? "" : url, "note", c.note(), "footer", footer));
		if (url == null) {
			html = html.replaceAll("(?s)<!--button-->.*?<!--/button-->", "");
		}
		try {
			MimeMessage message = sender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(props.mailFrom());
			helper.setTo(to);
			helper.setSubject(c.subject());
			helper.setText(plain, html);
			helper.addInline("logo", LOGO, "image/png");
			sender.send(message);
		}
		catch (MessagingException e) {
			throw new IllegalStateException("Could not build the email", e);
		}
	}

	static Content content(EmailLink link, boolean fr) {
		return switch (link) {
			case CONFIRM -> fr
					? new Content("Confirmez votre adresse e-mail",
							"Confirmez votre adresse e-mail pour activer votre compte Intervio.",
							"Confirmer l'adresse e-mail",
							"Le lien est valable 24 heures. Si vous n'avez pas créé ce compte, ignorez cet e-mail.")
					: new Content("Confirm your email", "Confirm your email to activate your Intervio account.",
							"Confirm email",
							"The link is valid for 24 hours. If you did not create this account, you can ignore this email.");
			case SIGN_IN -> fr
					? new Content("Votre lien de connexion", "Utilisez ce lien pour vous connecter à Intervio.",
							"Se connecter",
							"Le lien est valable 15 minutes et ne fonctionne qu'une fois. Si vous ne l'avez pas demandé, ignorez cet e-mail.")
					: new Content("Your sign-in link", "Use this link to sign in to Intervio.", "Sign in",
							"The link is valid for 15 minutes and works once. If you did not ask for it, you can ignore this email.");
			case RESET -> fr
					? new Content("Réinitialisez votre mot de passe",
							"Utilisez ce lien pour définir un nouveau mot de passe.", "Définir un nouveau mot de passe",
							"Le lien est valable 1 heure. Si vous ne l'avez pas demandé, ignorez cet e-mail.")
					: new Content("Reset your password", "Use this link to set a new password.", "Set a new password",
							"The link is valid for 1 hour. If you did not ask for it, you can ignore this email.");
			case CHANGE_EMAIL -> fr
					? new Content("Confirmez votre nouvelle adresse e-mail",
							"Confirmez cette adresse pour en faire l'adresse de votre compte Intervio.",
							"Confirmer l'adresse e-mail",
							"Le lien est valable 24 heures. Si vous ne l'avez pas demandé, ignorez cet e-mail.")
					: new Content("Confirm your new email", "Confirm this address to make it your Intervio account email.",
							"Confirm email",
							"The link is valid for 24 hours. If you did not ask for it, you can ignore this email.");
		};
	}

	/** Puts the values in the template; every value is HTML-escaped (the name comes from the user). */
	static String fill(Map<String, String> values) {
		String html = TEMPLATE;
		for (Map.Entry<String, String> v : values.entrySet()) {
			html = html.replace("{{" + v.getKey() + "}}", HtmlUtils.htmlEscape(v.getValue(), "UTF-8"));
		}
		return html;
	}

	private static String read(String path) {
		try {
			return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

}
