const Storage = {
    DB_NAME: 'uk_campus_locations',

    save(location) {
        const locations = this.getAll();
        locations.unshift(location);
        localStorage.setItem(this.DB_NAME, JSON.stringify(locations));
    },

    getAll() {
        const data = localStorage.getItem(this.DB_NAME);
        return data ? JSON.parse(data) : [];
    },

    delete(id) {
        let locations = this.getAll();
        locations = locations.filter(loc => loc.id !== id);
        localStorage.setItem(this.DB_NAME, JSON.stringify(locations));
    },

    clear() {
        localStorage.removeItem(this.DB_NAME);
    }
};
