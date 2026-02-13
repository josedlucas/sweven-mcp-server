"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Store credentials in a local file for persistence across server restarts
// In a production environment, this should be handled more securely
const CONFIG_FILE = path.join(__dirname, 'config.json');
class AuthService {
    config = {};
    constructor() {
        this.loadConfig();
    }
    loadConfig() {
        if (fs.existsSync(CONFIG_FILE)) {
            try {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                this.config = JSON.parse(data);
            }
            catch (error) {
                console.error('Error loading config:', error);
            }
        }
    }
    saveConfig() {
        try {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
        }
        catch (error) {
            console.error('Error saving config:', error);
        }
    }
    async login(email, password) {
        if (email && password) {
            this.config.email = email;
            this.config.password = password;
            this.saveConfig();
        }
        if (!this.config.email || !this.config.password) {
            throw new Error('Credentials not set. Please use set_credentials tool first.');
        }
        try {
            const response = await axios_1.default.post('https://autodispatch.swevenbpm.com/v1/auth/login', {
                email: this.config.email,
                password: this.config.password
            });
            if (response.data && response.data.jwtToken) {
                this.config.token = response.data.jwtToken;
                this.saveConfig();
                return this.config.token;
            }
            else {
                throw new Error('Invalid login response');
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`Login failed: ${error.message}`);
            }
            throw error;
        }
    }
    getToken() {
        return this.config.token;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.js.map