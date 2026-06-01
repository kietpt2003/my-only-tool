import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// 👉 Dùng Alias import trực tiếp ảnh như một biến Javascript
import avatarImg from '@/assets/avatar.jpg';

const LoginScreen: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId="797919519685-raio24mb9u572jjc26o7mj7bsg8m4vrc.apps.googleusercontent.com">
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans selection:bg-teal-500 selection:text-white">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-6 transition-all duration-300 hover:shadow-2xl">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            My Only Tool
          </h2>
          <div className="relative w-24 h-24 mx-auto">
            <img
              className="w-24 h-24 rounded-full border-4 border-teal-500 object-cover shadow-md"
              src={avatarImg}
              alt="Phạm Tuấn Kiệt"
            />
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>

          <div className="space-y-2">
            <div className="text-lg font-bold text-slate-900 tracking-tight">Phạm Tuấn Kiệt</div>
            <div className="text-sm text-slate-500 leading-relaxed px-2">
              Fullstack Developer &amp; React Native Specialist
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <a
                href="https://www.facebook.com/tuankiet29012003"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <img
                  src="https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white"
                  alt="Facebook"
                  className="h-7 rounded"
                />
              </a>
              <a
                href="https://www.linkedin.com/in/kietpt2003"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <img
                  src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"
                  alt="LinkedIn"
                  className="h-7 rounded"
                />
              </a>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sign In
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="flex justify-center pt-1 filter drop-shadow-sm">
            <GoogleLogin
              ux_mode="redirect"
              login_uri={`${process.env.API_URL}/api/auth/v2/google`}
              onSuccess={() => { }}
              onError={() => console.error('Failed to create Google Login')}
              theme="outline"
              size="large"
            />
          </div>

        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginScreen;
