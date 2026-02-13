export declare class AuthService {
    private config;
    constructor();
    private loadConfig;
    private saveConfig;
    login(email?: string, password?: string): Promise<string>;
    getToken(): string | undefined;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.d.ts.map