package com.intervio.auth;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/** Sends the email links in the user's language (spec section 8). */
@Component
class AuthMailer {

	private final JavaMailSender sender;

	private final AuthProperties props;

	AuthMailer(JavaMailSender sender, AuthProperties props) {
		this.sender = sender;
		this.props = props;
	}

	void send(User user, EmailLink link, String token) {
		boolean fr = user.getLocale() == User.LOCALE_FR;
		String url = props.frontendUrl() + "/auth/link?token=" + token;
		String hello = (fr ? "Bonjour " : "Hello ") + user.getFullName() + ",";
		String subject;
		String body;
		switch (link) {
			case CONFIRM -> {
				subject = fr ? "Confirmez votre adresse e-mail" : "Confirm your email";
				body = (fr ? "confirmez votre adresse e-mail pour activer votre compte Intervio."
						: "confirm your email to activate your Intervio account.") + "\n\n"
						+ (fr ? "Confirmer l'adresse e-mail : " : "Confirm email: ") + url + "\n\n"
						+ (fr ? "Le lien est valable 24 heures. Si vous n'avez pas créé ce compte, ignorez cet e-mail."
								: "The link is valid for 24 hours. If you did not create this account, you can ignore this email.");
			}
			case SIGN_IN -> {
				subject = fr ? "Votre lien de connexion" : "Your sign-in link";
				body = (fr ? "utilisez ce lien pour vous connecter à Intervio." : "use this link to sign in to Intervio.")
						+ "\n\n" + (fr ? "Se connecter : " : "Sign in: ") + url + "\n\n"
						+ (fr ? "Le lien est valable 15 minutes et ne fonctionne qu'une fois. Si vous ne l'avez pas demandé, ignorez cet e-mail."
								: "The link is valid for 15 minutes and works once. If you did not ask for it, you can ignore this email.");
			}
			default -> {
				subject = fr ? "Réinitialisez votre mot de passe" : "Reset your password";
				body = (fr ? "utilisez ce lien pour définir un nouveau mot de passe." : "use this link to set a new password.")
						+ "\n\n" + (fr ? "Définir un nouveau mot de passe : " : "Set a new password: ") + url + "\n\n"
						+ (fr ? "Le lien est valable 1 heure. Si vous ne l'avez pas demandé, ignorez cet e-mail."
								: "The link is valid for 1 hour. If you did not ask for it, you can ignore this email.");
			}
		}
		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(props.mailFrom());
		message.setTo(user.getEmail());
		message.setSubject(subject);
		message.setText(hello + " " + body);
		sender.send(message);
	}

}
