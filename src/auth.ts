import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getOrCreateUser, getUserById } from './db.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      picture: string;
    }
  }
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await getOrCreateUser(profile);
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (err) {
    done(err as Error);
  }
});

export { passport };
