import * as authService from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const userId = req.user.sub;
    const user = await authService.getUserProfile(userId);
    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
