import { supabase } from "./client";

import { File } from "expo-file-system";

export const uploadProfileImage =  async (userId: string, imageUri: string) => {
    try {
        const fileExtension = imageUri.split(".").pop() || "jpg";
        const fileName = `${userId}/profile.${fileExtension}`;
        const file = new File(imageUri);
        const bytes = await file.bytes();

        const { error } = await supabase.storage
        .from("profiles")
        .upload(fileName, bytes, {
            contentType: `image/${fileExtension}`,
            upsert: true,
        });

        if (error) {
            throw error;
        }

        const { data: urlData } = supabase.storage
            .from("profiles")
            .getPublicUrl(fileName);
            
        return urlData.publicUrl;
    } catch(error) {
        console.error("Error in uploading profile image: ", error);
        throw error;
    }
}
