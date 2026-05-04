import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

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
                lat: location.lat,
                lng: location.lng
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
    }
};
