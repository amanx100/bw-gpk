#!/usr/bin/env node

import os from 'os';
import clipboardy from 'clipboardy';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readlineSync from 'readline-sync';

//const userHomeDir = process.env.HOME;
const userHomeDir = os.homedir();
const directoryPath = userHomeDir + '/.bw-gpk';
const configFilePath = userHomeDir + '/.ssh/config'

// Checking the .bw-gpk directory to keep the relevant files
try {
    fs.mkdirSync(directoryPath);
    //console.log('Directory created: ' + directoryPath);
} catch (err) {
    /*if (err.code === 'EEXIST') {
        console.log('Directory exists: ' + directoryPath);
    } else {
        console.error(err.message);
    }*/
}

async function process_ssh_config_pkey(data) {
    //console.log(data)
    //process.exit()

    let privateKeysString = data

    const keyBlocks = privateKeysString.match(/(-+)BEGIN(.*)KEY(-+)(\s.+)*END(.*)KEY(-+)/g);
    const hostBlocks = privateKeysString.match(/Host (\S+ *)(\s +\S+ +\S+ *)+/g);

   if(keyBlocks && keyBlocks.length){
       let i = 0;
       for (const block of keyBlocks) {
           i++;
           const tempFilePath = path.join(directoryPath, 'key_' + i + '.pem');

           try {
               // Write the file synchronously
               fs.writeFileSync(tempFilePath, block + "\n")
               console.log(`Private key ${i} extracted: ${path.basename(tempFilePath)}`)

               // Execute the commands synchronously
               execSync(`chmod 600 ${tempFilePath} && ssh-add ${tempFilePath}`)
               //console.log(`Private key ${i} loaded to ssh-agent: ${path.basename(tempFilePath)}`)

               // Delete the file synchronously
               fs.unlinkSync(tempFilePath)
               console.log(`Private key ${i} deleted: ${path.basename(tempFilePath)}`)
           } catch (e) {
               console.error(e.message)
           }
       }
   } else {
       console.warn("No key blocks found!")
       console.info("Example key block: ", `
-----BEGIN OPENSSH PRIVATE KEY-----
<PrivateKeyContents>
-----END OPENSSH PRIVATE KEY-----`)
   }


   if(hostBlocks && hostBlocks.length){
       let configFileContent = "";
       for (const block of hostBlocks) {
           configFileContent += block + "\n\n";
       }

       try {
           // Write the content synchronously
           fs.writeFileSync(configFilePath, configFileContent);
           console.log('SSH Config file created:', configFilePath);
       } catch (err) {
           console.error(err.message);
       }
   }else {
       console.warn("No host blocks found!")
       console.info("Example host block: ", `
Host hostname1
  Hostname <IP/FQDN>
  User <UserName>`)
   }

}

async function clear() {
    try {
        // Synchronously delete all identities from the ssh-agent
        const agentDelOutput = await execSync('ssh-add -D');
        console.log(`Private keys removed from ssh-agent`);

        // Synchronously delete the SSH config file
        await fs.unlinkSync(configFilePath);
        console.log('SSH config file deleted:', configFilePath);

    } catch (error) {
        console.error(error.message);
    }
}

async function get_contents() {

    // Get the file path from command-line arguments
    const filePath = process.argv[2];

    if (filePath) {
        // If file path is given, read the file content synchronously
        try {
            const fileData = fs.readFileSync(filePath, 'utf8');
            //console.log('File content:\n', data);
            process_ssh_config_pkey(fileData)
        } catch (err) {
            console.error('Error reading the file:', err.message);
        }
    } else {
        // If no file path is provided, read clipboard content
        try {
            const clipboardContent = clipboardy.readSync();
            //console.log('Clipboard content:\n', clipboardContent);
            if(clipboardContent){
                process_ssh_config_pkey(clipboardContent)
            }else{
                console.warn("Your clipboard is empty!")
            }
        } catch (err) {
            console.error('Error reading clipboard:', err.message);
        }
    }

}


async function main(){

    let ssh_agent_sock = process.env.SSH_AUTH_SOCK;
    if (fs.existsSync(ssh_agent_sock)) {
        console.log('SSH agent is running...');
        let command = process.argv[2]?.toLowerCase()

        if (typeof command == 'string') {
            if (command === "clear") {
                await clear()
            } else {
                get_contents()
            }
        } else if(typeof command == "undefined") {
            get_contents()
        } else {
            console.warn("Invalid command or argument")
            console.info("Valid command is \"clear\" and argument is file path or empty argument with contents in the clipboard")
        }
    } else {
        console.log('SSH agent not found. Please run ssh-agent process first.');
        console.info("You can try the following command to run ssh-agent:\n > eval $(ssh-agent -s)")
    }
}

main()