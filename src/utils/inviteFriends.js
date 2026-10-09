// Shared "Invite Friends" share-sheet logic used by both the Home page's
// clickable link (Home.jsx) and the header menu's button (Headerbar.jsx),
// so the two entry points can never drift apart.
export async function shareInviteFriends({ userId, firstName, lastName }) {
    const frontendURL = window.location.origin;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : 'A friend';
    const registerUrl = userId
        ? `${frontendURL}/register?invited_by=${btoa(userId)}`
        : frontendURL;

    const message = `${fullName} has invited you to create an account on WordGAMLE!\n\n👉 Enter ‘Casa’ (case sensitive) to get into the site. ${registerUrl}`;

    // The link is already embedded in `message` above, so shareData
    // carries only `text` - a separate `url` field would make Mobile share
    // targets append the link a second time, and Windows' native Share
    // panel only accepts `url` and silently drops `text` anyway, which is
    // why Desktop skips navigator.share() entirely below.
    const shareData = { title: 'Join WordGAMLE!', text: message };
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
