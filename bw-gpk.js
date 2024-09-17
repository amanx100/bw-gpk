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
    console.log('Directory created: ' + directoryPath);
} catch (err) {
    if (err.code === 'EEXIST') {
        console.log('Directory exists: ' + directoryPath);
    } else {
        console.error(err);
    }
}

async function process_ssh_config_pkey(data) {
    //console.log(data)
    //process.exit()

    let privateKeysString = data

    const regex = /(-+)BEGIN(.*)KEY(-+)(\s.+)*END(.*)KEY(-+)/g;
    const regexHost = /Host (\S+ *)(\s +\S+ +\S+ *)+/g;
    const keyBlocks = privateKeysString.match(regex);
    const hostBlocks = privateKeysString.match(regexHost);

    let i = 0
    for (const block of keyBlocks) {
        i++

        //console.log(block)
        const tempFilePath = path.join(directoryPath, 'key_' + i + '.pem');
        const writeStream = fs.createWriteStream(tempFilePath);

        writeStream.write(block + "\n");
        writeStream.end(() => {
            console.log('Temp file created:', path.basename(tempFilePath));

            exec(`chmod 600 ${tempFilePath} && ssh-add  ${tempFilePath}`, (error, stdout, stderr) => {
                // Delete the temp file when done
                fs.unlink(tempFilePath, (err) => {
                    if (err) {
                        console.error('Error deleting temp file [' + tempFilePath + ']:', err);
                    } else {
                        console.log('Temp file deleted:', path.basename(tempFilePath));
                    }
                });
                if (error) {
                    console.error(`Error executing command: ${error.message}`);
                } else {
                    console.log(`${stdout}`);
                    console.error(`${stderr}`);
                }
            });

        });

    }

    let configFileContent = ""
    for (const block of hostBlocks){
        configFileContent += block + "\n\n"
    }

    //console.log(configFileContent)
    const writeStreamHc = fs.createWriteStream(configFilePath);

    writeStreamHc.write(configFileContent);
    writeStreamHc.end(() => {
        console.log('SSH Config file created:', path.basename(configFilePath));
    });
}


async function clear() {

    const promise_agent_del = await new Promise((resolve, reject)=>{
        exec('ssh-add -D', (error, stdout, stderr) => {
            if (error) {
                reject(error.message)
            } else {
                resolve(stdout)
            }
        });
    })

    const promise_file_del = await new Promise((resolve, reject)=>{
        fs.unlink(configFilePath, (err) => {
            if (err) {
                reject(err.message)
            } else {
                resolve('SSH config file deleted:', path.basename(configFilePath))
            }
        });
    })

    return {promise_agent_del, promise_file_del}
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
            process_ssh_config_pkey(clipboardContent)
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