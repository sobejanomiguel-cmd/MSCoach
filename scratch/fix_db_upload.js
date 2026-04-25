const fs = require('fs');
const content = fs.readFileSync('db.js', 'utf8');

const oldUploadFile = `    async uploadFile(file, bucket = 'tareas', path = 'documents') {
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
    }`;

const newUploadFile = `    async uploadFile(file, bucket = 'tareas', path = 'documents') {
        if (!supabaseClient) return null;
        try {
            const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
            const fileName = \`\${Math.random().toString(36).substring(2)}-\${Date.now()}\${fileExt ? '.' + fileExt : ''}\`;
            const filePath = \`\${path}/\${fileName}\`;

            const { data, error } = await supabaseClient.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error("Supabase Storage Error:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabaseClient.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error("Error subiendo archivo a Storage:", err);
            throw err; // Re-throw to handle it in the UI
        }
    }`;

if (content.includes(oldUploadFile)) {
    fs.writeFileSync('db.js', content.replace(oldUploadFile, newUploadFile));
    console.log('Success');
} else {
    console.log('uploadFile function not found');
}
