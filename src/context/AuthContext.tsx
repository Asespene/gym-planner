import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "../../lib/supabase/client";

export interface User {
    id: string;
    name: string;
    email: string;
    username: string;
    profileImage?: string;
    onboardingCompleted?: boolean;
}

interface AuthContextType {
    user: User | null;
    signUp: (email: string, password: string) => Promise<void>;
    updateUser: (userData: Partial<User> ) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isLoadingSession: boolean;

}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children } : { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    // true if still checking, false otherwise
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id, session.user.email ?? "");
                setUser(profile);
            } else {
                setUser(null);
            }


        } catch (error) {
            console.error("Error","failed to validate session.");
            setUser(null); 
        } finally {
            setIsLoadingSession(false);
        }
    }


    const signUp = async (email: string, password: string) => {
        try {
            const { data , error } = await supabase.auth.signUp({
                email,
                password,
            })

            if (error) {
                throw error;
            }

            if (data.user) {
                const profile = await fetchUserProfile(data.user.id, data.user.email ?? email);
                setUser(profile);
            }
        } catch (error) {
            console.error("Sign Up Failed", error);
            throw error;
        } 

    }

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                throw error;
            }

            if (data.user) {
                const profile = await fetchUserProfile(data.user.id, email);
                setUser(profile);
            }
        } catch (error) {
            console.error("Log In Failed", error);
            throw error;
        }
    }

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            if (user) {
                setUser(null);
            }
        } catch (error) {
            console.error("Sign Out Failed", error);
            throw error;
        }
    }


    const updateUser = async (userData: Partial<User>) => {
        try {
            if (!user) {
                throw new Error("No signed-in user found.");
            }

            const updateData: any = {};

            if (userData.name !== undefined) {
                updateData.name = userData.name;
            }

            if (userData.username !== undefined) {
                updateData.username = userData.username;
            }

            if (userData.profileImage !== undefined) {
                updateData.profile_image = userData.profileImage;
            }

            if (userData.onboardingCompleted !== undefined) {
                updateData.user_authenticated = userData.onboardingCompleted;
            }

            const { error } = await supabase
                .from("user_profile")
                .upsert({ id: user.id, ...updateData }, { onConflict: "id" });
            
            if (error) {
                throw error;
            }

            setUser((currentUser) =>
                currentUser ? { ...currentUser, ...userData } : currentUser
            );

        } catch (error) {
            console.error("Error", "Failed to update the user values");
            throw error;

        }
       
    }

    

    const fetchUserProfile = async (userId: string, fallbackEmail: string): Promise<User | null> => {
        try {
            const {data, error} = await supabase
                .from("user_profile")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

                if (error) {
                    console.error("Error in fetching the profile!", error);
                    return null;
                }
                
                return {
                    id: userId,
                    name: data?.name || "",
                    username: data?.username || "",
                    email: fallbackEmail,
                    profileImage: data?.profile_image,
                    onboardingCompleted: data?.user_authenticated || false
                }
        } catch (error) {
            console.error("Error, fetch failed", error);
            return null;
        }
    }
    
    return (
        <AuthContext.Provider value={{user, signUp, updateUser, signIn, signOut, isLoadingSession}}>{children}</AuthContext.Provider>
    );

   

}

export const useAuth = () => {
    const context = useContext(AuthContext)

    if (context === undefined) {
        throw new Error("must be inside the provider!");
    }

    return context;
}
