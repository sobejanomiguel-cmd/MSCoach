const fs = require('fs');
const content = fs.readFileSync('db.js', 'utf8');
const oldCode = `    async uploadImage(file) {
        if (!supabaseClient) return null;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = \`\${Math.random().toString(36).substring(2)}-\${Date.now()}.\${fileExt}\`;
            const filePath = \`tasks/\${fileName}\`;

            const { data, error } = await supabaseClient.storage
                .from('tareas')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabaseClient.storage
                .from('tareas')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error("Error subiendo imagen a Storage:", err);
            return null;
        }
    }`;

const newCode = `    async uploadFile(file, bucket = 'tareas', path = 'documents') {
        if (!supabaseClient) return null;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = \`\${Math.random().toString(36).substring(2)}-\${Date.now()}.\${fileExt}\`;
            const filePath = \`\${path}/\${fileName}\`;

            const { data, error } = await supabaseClient.storage
                .from(bucket)
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabaseClient.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error("Error subiendo archivo a Storage:", err);
            return null;
        }
    }

    async uploadImage(file) {
        return this.uploadFile(file, 'tareas', 'tasks');
    }`;

if (content.includes(oldCode)) {
    fs.writeFileSync('db.js', content.replace(oldCode, newCode));
    console.log('Success');
} else {
    console.log('Old code not found');
}
