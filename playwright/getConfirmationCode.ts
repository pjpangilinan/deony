import fs from 'fs';
import path from 'path';

export function getConfirmationCode(username: string): string {
  const dbDir = path.resolve(process.cwd(), '.cognito', 'db');
  
  // Try up to 5 times (waiting for file to be written)
  for (let attempt = 0; attempt < 5; attempt++) {
    const files = fs.readdirSync(dbDir).filter(f => f.startsWith('local_') && f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dbDir, file), 'utf8');
        const db = JSON.parse(content);
        
        if (db.Users) {
          // Look for the user by username or email
          for (const [id, user] of Object.entries(db.Users)) {
            const userObj = user as any;
            if (userObj.Username === username || id === username) {
              if (userObj.ConfirmationCode) {
                return userObj.ConfirmationCode;
              }
            }
          }
        }
      } catch (err) {
        // Ignore JSON parse errors if file is being written
      }
    }
    
    // Sleep synchronously for 1 second
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  
  throw new Error(`Confirmation code not found for user ${username}`);
}
