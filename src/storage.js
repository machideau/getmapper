import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase credentials missing! Check your .env file.');
}

const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const Storage = {
    async save(location) {
        const { data, error } = await _supabase
            .from('locations')
            .insert([{
                name: location.name,
                campus: location.campus,
                type: location.type || 'Autre',
                description: location.description,
                lat: location.lat,
                lng: location.lng,
                image_urls: location.image_urls
            }]);

        if (error) {
            console.error('Error saving to Supabase:', error);
            throw error;
        }
        return data;
    },

    async getAll() {
        const { data, error } = await _supabase
            .from('locations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching from Supabase:', error);
            return [];
        }
        return data;
    },

    async delete(id) {
        const { error } = await _supabase
            .from('locations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting from Supabase:', error);
            throw error;
        }
    },

    async update(id, location) {
        const { data, error } = await _supabase
            .from('locations')
            .update({
                name: location.name,
                campus: location.campus,
                type: location.type,
                description: location.description,
                image_urls: location.image_urls
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating Supabase:', error);
            throw error;
        }
        return data;
    },

    async uploadImage(blob, fileName) {
        const { data, error } = await _supabase.storage
            .from('location-images')
            .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error uploading to Storage:', error);
            throw error;
        }

        const { data: publicUrlData } = _supabase.storage
            .from('location-images')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    },

    // [MODIFY] src/storage.js
    subscribeToChanges(callback) {
        const channel = _supabase
            .channel('schema-db-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'locations'
            }, (payload) => {
                callback(payload);
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Erreur de connexion Realtime. Vérifiez les paramètres de réplication Supabase.');
                }
            });
        return channel;
    }

};
