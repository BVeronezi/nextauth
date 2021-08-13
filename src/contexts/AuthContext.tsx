import { createContext, ReactNode, useEffect, useState } from "react";
import { setCookie, parseCookies, destroyCookie } from 'nookies';
import Router from 'next/router';
import { api } from "../services/api";

type User = {
    email: string
    permissions: string[];
    roles: string[];
};

type SignCredentials = {
    email: string;
    password: string;
}

type AuthContextData = {
    signIn(credentials: SignCredentials): Promise<void>;
    user: User;
    isAuthenticated: boolean;
};

type AuthProviderProps = {
    children: ReactNode
}

export const AuthContext = createContext({} as AuthContextData);

export function signOut() {
    destroyCookie(undefined, 'nextauth.token');
    destroyCookie(undefined, 'nextauth.refreshToken');

    Router.push('/');
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User>(null);
    const isAuthenticated = !!user;

    useEffect(() => {
        const { 'nextauth.token': token } = parseCookies()

        if (token) {
            api.get('/me').then(response => {
              const { email, permissions, roles } = response.data;

              setUser({
                  email,
                  permissions,
                  roles
              })
            })
            .catch(()  => {
                signOut();
            })
        }
    }, [])

    async function signIn({email, password}: SignCredentials) {
        try {
            const response = await api.post('sessions', { 
                email,
                password
            })

            const { token, refreshToken, permissions, roles } = response.data;

            setCookie(undefined, 'nextauth.token', token, {
                // Quanto tempo eu quero manter o cookie salvo no browser
                maxAge: 60 * 60 * 24 * 30,  // 30 days
                // Quais caminhos da aplicação tem acesso a esse cookie
                path: '/' // Qualquer endereço 
            });

            setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
                  maxAge: 60 * 60 * 24 * 30, 
                  path: '/' 
            });

            setUser({
                email,
                permissions,
                roles
            })

            api.defaults.headers['Authorization'] = `Bearer ${token}`

            Router.push('/dashboard');     
        } catch (error) {
            console.log(error)
        }     
    }

    return (
        <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
            {children}
        </AuthContext.Provider>
    )
}