const SUPABASE_URL = 'https://dzksjelewcqrjpfmzogu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6a3NqZWxld2NxcmpwZm16b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNDIwOCwiZXhwIjoyMDg4NTgwMjA4fQ.Ogv8C9HKaKNv-sC4MRjiWBanZt4zikCaY8A9O8NeZdI';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const Storage = {
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
