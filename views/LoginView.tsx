import React from 'react';
// FIX: Use Firebase v8 namespaced API. signInWithPopup is a method on the auth object.
import { auth, googleProvider } from '../firebase';
import Button from '../components/Button';
import GoogleIcon from '../components/icons/GoogleIcon';


const LoginView: React.FC = () => {
    const handleGoogleLogin = async () => {
        try {
            // FIX: Use Firebase v8 namespaced API for authentication.
            await auth.signInWithPopup(googleProvider);
        } catch (error) {
            console.error("Authentication error:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-sm w-full bg-white p-8 rounded-xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Mini Gym Tracker</h1>
                <p className="text-gray-500 mb-8">Войдите, чтобы продолжить</p>
                <Button onClick={handleGoogleLogin} className="flex items-center justify-center gap-3">
                    <GoogleIcon />
                    Войти с помощью Google
                </Button>
            </div>
        </div>
    );
};

export default LoginView;
