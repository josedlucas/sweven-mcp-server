import { authService } from '../auth.js';
async function login() {
    const email = "jsdlcs266@gmail.com";
    const password = "$%Jhosed25";
    try {
        console.log("Attempting to login...");
        const token = await authService.login(email, password);
        console.log("Login successful!");
        console.log("Token:", token);
    }
    catch (error) {
        console.error("Login failed:", error.message);
        process.exit(1);
    }
}
login();
