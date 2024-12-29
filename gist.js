export default async function gist(patch) {
    if (!patch) {
        const response = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${process.env.GIST_KEY}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const gistData = await response.json();
        const users = JSON.parse(gistData.files['users.json'].content);
        return users;
    }
    else {
  
        await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${process.env.GIST_KEY}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'users.json': {
                        content: patch
                    }
                }
            })
        });
  
        const response = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
          method: 'GET',
          headers: {
              'Authorization': `token ${process.env.GIST_KEY}`,
              'Accept': 'application/vnd.github.v3+json'
          }
        });
        const gistData = await response.json();
        const users = JSON.parse(gistData.files['users.json'].content);
        return users;
  
    }
}