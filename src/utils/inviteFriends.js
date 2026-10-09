// Shares a block of text via the OS share sheet on mobile devices, or
// copies it to the clipboard on Desktop. Desktop skips navigator.share()
// entirely even when the browser supports it, because Windows' native
// Share panel only accepts a separate `url` field and silently drops
// `text` - no combination of fields can make it show a full message, so
// copying straight to the clipboard is the only way to guarantee Desktop
// gets the complete text every time.
export async function shareText(message, title = 'Join WordGAMLE!') {
    const shareData = { title, text: message };
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobileDevice && navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error('Share failed:', err);
        }
    } else {
        try {
            await navigator.clipboard.writeText(message);
            alert('Invite message copied to clipboard!');
        } catch (err) {
            alert('Could not copy. Please share manually.');
        }
    }
}

// Shared "Invite Friends" (site-only, no group) share-sheet logic used by
// both the Home page's clickable link (Home.jsx) and the header menu's
// button (Headerbar.jsx), so the two entry points can never drift apart.
export async function shareInviteFriends({ userId, firstName, lastName }) {
    const frontendURL = window.location.origin;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : 'A friend';
    const registerUrl = userId
        ? `${frontendURL}/register?invited_by=${btoa(userId)}`
        : frontendURL;

    // This link already bypasses the site's Casa password gate (see
    // Layout.jsx's always-unlocked routes), so the note below is purely
    // informational - for if this message gets forwarded on its own,
    // without the link, to someone who then tries to visit the site
    // directly.
    const message = `${fullName} has invited you to create an account on WordGAMLE!\n${registerUrl}\n\n👉 Note that WordGAMLE is password protected. Anyone who logs on without an Invite from an existing Gamler will need to enter ‘Casa’ (case sensitive) to gain access.`;

    await shareText(message);
}
