import { supabase } from "./client";

export interface Character {
    id: string;
    user_id: string;
    name: string;
    goal: string | null;
    training_days: number;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export type CreateCharacterValues = {
    user_id: string;
    name: string;
    goal?: string | null;
    training_days: number;
    image_url?: string | null;

}

//fetches all the characters for the specific User(userId)
export async function fetchAllCharacters(userId:string) : Promise<Character[]> {
    if (!userId) {
        throw new Error("userId is needed");
    }

    try {
        const { data, error } = await supabase
            .from("characters")
            .select("*")
            .eq('user_id', userId)
            .order('created_at', { ascending: false }) 
        
        if (error) {
            throw error;
        }

        return data as Character[];
        
    } catch (error) {
        console.error("Failed to fetch all the characters", error);
        throw error;
    }
}

//creates a new row of the object character and inserts into the table Character
export async function createCharacter(input: CreateCharacterValues): Promise<Character> {
    try {
        const { data, error } = await supabase 
            .from("characters")
            .insert(input)
            .select()
            .single()
        
        if (error) {
            throw error;
        }

        return data as Character;
    } catch (error) {
        console.error("Error in creating a character!", error);
        throw error;
    }
}

//fetch a single character, looks for a single unique character in an owner
export async function fetchCharacter(characterId: string): Promise<Character> {
    if (!characterId) {
        throw new Error("A valid characterId is needed");
    }

    try {
        const { data, error } = await supabase
            .from("characters")
            .select("*")
            .eq("id", characterId)
            .single()
        
        if (error) {
            throw error;
        }

        return data as Character;
    } catch (error) {
        console.error("Error in fetching the one character", error);
        throw error;
    }
}

export async function deleteCharacter(characterId: string): Promise<void> {
    if (!characterId) {
        throw new Error("Need a valid characterId!");
    }

    try {
        const { error } = await supabase 
            .from("characters")
            .delete()
            .eq("id", characterId)
        
        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Failed to delete the character!", error);
        throw error;
    }
}