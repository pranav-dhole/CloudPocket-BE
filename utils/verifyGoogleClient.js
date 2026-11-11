import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export async function verifyGoogleClient(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: `${process.env.CLIENT_ID}`,
    });
    const userInfoFromTicket = ticket.getPayload();
    return userInfoFromTicket;
  } catch (err) {
    console.log(err);
  }
}
