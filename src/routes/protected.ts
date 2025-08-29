import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// This entire router is protected because we applied `getSession` and `requireAuth` in index.ts
router.get('/protected-data', requireAuth, (req: Request, res: Response) => {
    // By the time we get here, `requireAuth` has already verified a session exists.
    // The user's session data is available on req.session
    res.json({
        message: `This is protected data for user: ${req.session.user.email}`,
        session: req.session,
    });
});

export default router;