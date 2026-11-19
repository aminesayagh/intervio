package com.intervio.auth;

import com.intervio.files.FileService;

/**
 * The logged-in user as the frontend sees it. The photo is the uploaded one, else the Google
 * account photo, else none (the initial is shown).
 */
record Me(String fullName, String email, String pendingEmail, String photoUrl, boolean hasPassword,
		boolean googleConnected) {

	static Me of(User user, FileService files) {
		String photo = user.getPhotoFileId() != null ? "/api/files/" + files.get(user.getPhotoFileId()).getUuid()
				: user.getGooglePictureUrl();
		return new Me(user.getFullName(), user.getEmail(), user.getPendingEmail(), photo,
				user.getPasswordHash() != null, user.getGoogleId() != null);
	}

}
