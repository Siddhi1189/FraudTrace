import * as accountService from '../services/account.service.js';

export async function getAccount(req, res, next) {
  try {
    const data = await accountService.getAccountDetails(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getAccountTransactions(req, res, next) {
  try {
    const data = await accountService.getAccountTransactions(req.params.id);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}
