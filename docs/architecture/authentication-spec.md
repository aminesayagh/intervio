# Intervio — authentication specification

**Date:** 2026-11-18  
**Purpose:** Everything decided for the authentication workflow, and nothing more, so it can be built as is.  
**Backend:** Spring Security.  
**Sources:** decisions 49–57 and 67, Accounts use cases 1, 3 and 4 in `use-cases.md`; screens 1–3 and 5–7 on `docs/Intervio.excalidraw` (area "Account management").  
**Focus:** the client account only. Invitations, bidders and client staff come later.

Anything not written here is **not decided**. Every point raised so far has been decided.

## 1. Scope

**In scope**

- Sign up (clients, from the public page).
- Email confirmation.
- Log in with Google, with a sign-in link, or with email and password.
- "Remember me".
- Forgot password and set a new password.
- The public header: logo, language switcher, light and dark mode.

**Out of scope**

- Onboarding (company details). Authentication only hands over to it (section 4.6).
- Invitations: sign-up from an invitation (screen 4), sending, confirming or declining them.
- Bidder, contractor and client staff accounts.
- Profile and account settings (deferred).
- Session storage: left to the authentication framework chosen for the build.

## 2. Who can sign up

- Only clients sign up, from the public page. Every account created by this workflow has `users.role` = 1 (client).
- One account per email address.

## 3. Data model

We follow Spring Security's own configuration and storage. The only table of ours is `users`, which Spring reads to log users in.

### users

| Column | Type | Rule |
|---|---|---|
| id | PK | |
| uuid | uuid | |
| full_name | text | Required. |
| email | text | Required, unique. |
| role | smallint | 1 client, 2 client_staff, 3 contractor. |
| password_hash | text, nullable | Empty for users who only use Google or sign-in links. |
| google_id | text, nullable, unique | Set when the user signs in with Google. |
| email_verified_at | date, nullable | The account is active only when this is set. |
| locale | smallint | 1 en, 2 fr. Used for the emails the user receives. |
| created_at | date | |
| updated_at | date | |

### Tokens for the email links

No table of ours. The three links (email confirmation, sign-in link, password reset) are Spring Security one-time tokens, stored by the framework's `JdbcOneTimeTokenService` in its own table, created from Spring's schema. A token works once and is removed when used.

### Sessions

Handled by Spring Security: the normal session, plus its remember-me cookie for "Remember me" (30 days). No table of ours.

## 4. Flows

### 4.1 Sign up with email and password (client)

1. The user fills in full name, work email, password (at least 12 characters) and the same password again in "Confirm password", then selects "Create account".
2. The account is created with role 1 (client) and `email_verified_at` empty.
3. A confirmation link (a one-time token) is sent by email, and screen 3 "Check your email" is shown.
4. When the user opens the link, `email_verified_at` is set and the account is active. The user is logged in and goes to onboarding (4.6).

### 4.2 Sign up with Google (client)

1. The user selects "Continue with Google".
2. The account is created with role 1, `google_id` set and `email_verified_at` set: Google already proves the email.
3. The user is logged in and goes to onboarding (4.6).

### 4.3 Sign up with a sign-in link (client)

1. The user fills in full name and work email, then selects "Email me a sign-in link instead".
2. The account is created with role 1, no password, `email_verified_at` empty.
3. A sign-in link (a one-time token) is sent, and screen 3 "Check your email" is shown.
4. When the user opens the link, `email_verified_at` is set, since the link proves the email. The user is logged in and goes to onboarding (4.6).

### 4.4 Log in

| Way | Steps |
|---|---|
| Email and password | Screen 1: email, password, optional "Remember me", then "Log in". |
| Google | Screen 1: "Continue with Google". |
| Sign-in link | Screen 1: the user enters their email and selects "Email me a sign-in link instead". A sign-in link is sent and screen 3 is shown. Opening the link logs the user in. |

A user whose email is not confirmed cannot use the platform (decision 52). If they log in with a password before confirming, the log in is refused and a new confirmation link is sent (within the link limits of section 5). After log in, a client who owns a company goes to the client board; otherwise to onboarding (4.6).

**Google with an email that already has an account:**

1. Find the user by `google_id`. If found, log them in.
2. Otherwise find the user by email. Link only when Google marks the email as verified (`email_verified` claim): set `google_id` and log them in.
3. If that existing account's email was not confirmed yet, confirm it and clear its password, so that someone who registered the email beforehand cannot keep access.
4. If no user has that email, this is a sign-up (4.2).

### 4.5 Forgot password

1. Screen 5: the user enters their email and selects "Send reset link".
2. Screen 6 is always shown, whether or not an account exists: "If an account exists for this email, we have sent a reset link. The link is valid for 1 hour." A reset link is sent only if the account exists.
3. The link opens screen 7: new password and confirmation (at least 12 characters), then "Save password".
4. Saving the password logs the user in directly.

### 4.6 Hand-over to onboarding

After a client's first confirmed sign-in, the client goes to onboarding (`use-cases.md` decisions 58–65). A client has finished onboarding when they own a company (`companies.owner_id`). Onboarding itself is not part of this specification.

## 5. Rules

| Rule | Value |
|---|---|
| Password length | At least 12 characters. |
| Email confirmation link | Required for email-and-password sign-up only. Valid for 24 hours, works once. |
| Sign-in link | Valid for 15 minutes, works once. |
| Password reset link | Valid for 1 hour, works once. |
| "Remember me" ticked | The user stays logged in for 30 days. |
| "Remember me" not ticked | The session ends when the browser closes. |
| Forgot password answer | Always the same message, so it never reveals whether an account exists. |
| Sign-in link for an email with no account | Screen 3 is shown anyway and nothing is sent, like forgot password. |
| Links | Each one is a one-time token: a used or expired link no longer works. |
| Failed log-in attempts | After 5 failed attempts in a row for the same email, log in with a password is blocked for 15 minutes for that email. A successful log in resets the count. |
| Email links | "Resend the link", the sign-in link and forgot password can each be requested at most once per minute and 5 times per hour for the same email. |

## 6. Screens and text

All screens: 1440 × 900, form in columns 5–8 of a 12-column grid, header with "Intervio" on the left and "EN / FR" and the light and dark switch on the right. Board numbers in brackets.

| Screen | Content (in order) |
|---|---|
| **Log in** (1) | Title "Log in" · button "Continue with Google" · "or" · Email · Password · checkbox "Remember me" and link "Forgot password?" · button "Log in" · link "Email me a sign-in link instead" · "No account? Sign up" |
| **Sign up** (2) | Title "Create your account" · "Continue with Google" · "or" · Full name · Work email · Password, helper "At least 12 characters." · Confirm password · button "Create account" · link "Email me a sign-in link instead" · "By creating an account, you agree to the Terms of use and the Privacy policy." · "Already have an account? Log in" |
| **Check your email** (3) | Title "Check your email" · "We sent a link to {email}. Open it to continue." · link "Resend the link" · link "Use another email" (goes to the log in screen) |
| **Forgot password** (5) | Title "Reset your password" · "Enter your email to receive a reset link." · Email · button "Send reset link" · link "Back to log in" |
| **Reset link sent** (6) | Title "Check your email" · "If an account exists for this email, we have sent a reset link. The link is valid for 1 hour." · link "Back to log in" |
| **Set a new password** (7) | Title "Set a new password" · New password, helper "At least 12 characters." · Confirm new password · button "Save password" |

**Link no longer valid** (new, not drawn yet): title "This link is no longer valid" · "It has expired or has already been used." · link "Back to log in". Shown for any expired or used confirmation, sign-in or reset link.

**Terms and privacy:** one line under the sign-up button, with links to the terms of use and the privacy policy, and no checkbox.

### Messages

Shown under the field concerned, or above the form for messages about the whole form.

| Situation | Message |
|---|---|
| Wrong email or password at log in | "Wrong email or password." |
| Log in with a password before the email is confirmed | "Confirm your email to log in. We have sent you a new link." (a new confirmation link is sent) |
| Required field left empty | "This field is required." |
| Email not in a valid format | "Enter a valid email address." |
| Password shorter than 12 characters | "Use at least 12 characters." |
| Password and confirmation differ (sign-up or new password) | "The passwords do not match." |
| Sign-up with an email that already has an account | "An account already exists for this email." followed by the link "Log in" |
| Google sign-in cancelled or failed | "Google sign-in did not complete. Try again." |
| Log in blocked after 5 failed attempts | "Too many attempts. Try again in 15 minutes." |
| Link requested again too soon | "Wait a minute before asking for a new link." |
| Expired or used link | The "Link no longer valid" screen above. |

## 7. Language and appearance

- The interface is in English and French, switched with "EN / FR" in the header.
- Light and dark mode, switched with the half-filled circle in the header.
- **First visit:** the language follows the browser (French if it is French, English otherwise); the mode follows the computer setting.
- The user's choices are then remembered. The language is also stored in `users.locale` once an account exists, so emails go out in that language.

## 8. Emails to send

Sent in the user's language (`users.locale`). French versions are simple translations, written during the build.

**Email confirmation** (sign-up with email and password)
- Subject: Confirm your email
- Body: "Hello {full name}, confirm your email to activate your Intervio account." · button "Confirm email" · "The link is valid for 24 hours. If you did not create this account, you can ignore this email."

**Sign-in link** (sign-up or log in with a sign-in link)
- Subject: Your sign-in link
- Body: "Hello {full name}, use this link to sign in to Intervio." · button "Sign in" · "The link is valid for 15 minutes and works once. If you did not ask for it, you can ignore this email."

**Password reset** (forgot password, only if the account exists)
- Subject: Reset your password
- Body: "Hello {full name}, use this link to set a new password." · button "Set a new password" · "The link is valid for 1 hour. If you did not ask for it, you can ignore this email."

## 9. Language of the text

Every screen, message and email is written in English here. The French text is a simple translation, done when each part is built.

## 10. Notes for Spring Security

| Need | What Spring Security provides |
|---|---|
| Email and password | Form log in with a `UserDetailsService` reading `users`; passwords hashed with a `PasswordEncoder` (for example BCrypt) into `password_hash`. |
| Google | `oauth2Login`, with a custom `OidcUserService` that finds, links or creates the user in `users` (section 4.4). |
| Sign-in link | One-time token login (`oneTimeTokenLogin`); a custom `OneTimeTokenGenerationSuccessHandler` sends the email. |
| Email confirmation | The same one-time token login: the confirmation link logs the user in, and on success the app sets `email_verified_at`. |
| Password reset | The same one-time token login: the reset link logs the user in and leads to screen 7. |
| Token storage | `JdbcOneTimeTokenService` (the default keeps tokens in memory and loses them on restart). |
| Token validity | Default 5 minutes; set per link with a `GenerateOneTimeTokenRequestResolver`: 24 hours for email confirmation, 15 minutes for the sign-in link, 1 hour for the reset link. |
| Attempt limits | Not built in. Count failures from Spring's authentication failure events and block for 15 minutes after 5; limit link requests in the app. |
| "Remember me" | `rememberMe` with a 30-day validity, cookie-based. |

