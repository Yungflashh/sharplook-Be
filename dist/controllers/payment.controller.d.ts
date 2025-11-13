import { Response, NextFunction } from 'express';
declare class PaymentController {
    initializePayment: (req: import("express").Request, res: Response, next: NextFunction) => void;
    verifyPayment: (req: import("express").Request, res: Response, next: NextFunction) => void;
    handleWebhook: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getPaymentById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserPayments: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
declare class WalletController {
    getBalance: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getTransactions: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getWalletStats: (req: import("express").Request, res: Response, next: NextFunction) => void;
    requestWithdrawal: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getWithdrawalById: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getUserWithdrawals: (req: import("express").Request, res: Response, next: NextFunction) => void;
    getAllWithdrawals: (req: import("express").Request, res: Response, next: NextFunction) => void;
    processWithdrawal: (req: import("express").Request, res: Response, next: NextFunction) => void;
    rejectWithdrawal: (req: import("express").Request, res: Response, next: NextFunction) => void;
}
export declare const paymentController: PaymentController;
export declare const walletController: WalletController;
export {};
//# sourceMappingURL=payment.controller.d.ts.map