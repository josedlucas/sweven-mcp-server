import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// Store credentials in a local file for persistence across server restarts
// In a production environment, this should be handled more securely
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'config.json');
export class AuthService {
    config = {};
    constructor() {
        this.loadConfig();
    }
    loadConfig() {
        if (fs.existsSync(CONFIG_FILE)) {
            try {
                if (process.env.SWEVEN_EMAIL && process.env.SWEVEN_PASSWORD) {
                    this.config.email = process.env.SWEVEN_EMAIL;
                    this.config.password = process.env.SWEVEN_PASSWORD;
                }
                if (process.env.SWEVEN_TOKEN) {
                    this.config.token = process.env.SWEVEN_TOKEN;
                }
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                const fileConfig = JSON.parse(data);
                // Merge file config but prefer env vars or existing valid config
                this.config = { ...fileConfig, ...this.config };
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
            const response = await axios.post('https://autodispatch.swevenbpm.com/v1/auth/login', {
                email: this.config.email,
                password: this.config.password
            });
            if (response.data && response.data.jwtToken) {
                this.config.token = response.data.jwtToken;
                this.saveConfig();
                // Access token is defined if login success
                return this.config.token;
            }
            else {
                throw new Error('Invalid login response');
            }
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Login failed: ${error.message}`);
            }
            throw error;
        }
    }
    async ensureAuthenticated() {
        if (this.config.token) {
            return this.config.token;
        }
        return this.login();
    }
    getToken() {
        return this.config.token;
    }
}
export const authService = new AuthService();
