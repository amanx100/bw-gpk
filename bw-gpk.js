#!/usr/bin/env node

const os = require('os');
const {exec, execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

//const userHomeDir = process.env.HOME;
const userHomeDir = os.homedir();
const directoryPath = userHomeDir + '/.bw-gpk';

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

function process_bw_to_ssh(data) {
    //console.log(data.notes)
    let privateKeysString = data.notes

    const regex = /(-+)BEGIN(.*)KEY(-+)(\s.+)*END(.*)KEY(-+)/g;
    const regexHost = /Host\s(.+)((\s).*(Hostname ).*\S)((\s).*(User ).*\S)/g;
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

            exec('ssh-add ' + tempFilePath, (error, stdout, stderr) => {
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
    const configFilePath = userHomeDir + '/.ssh/config'
    //console.log(configFileContent)
    const writeStreamHc = fs.createWriteStream(configFilePath);

    writeStreamHc.write(configFileContent);
    writeStreamHc.end(() => {
        console.log('SSH Config file created:', );
    });
}


function bw_get_item(noteName) {

    exec('bw get item ' + noteName, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
        } else {
            process_bw_to_ssh(JSON.parse(stdout))
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
        }
    });
}


function bw_check_status_go(noteName) {
    exec('bw status', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            console.info("If bw cli is not installed yet then you can try to install using the following command.\n > npm install -g @bitwarden/cli")
        } else {
            let bwStatus = JSON.parse(stdout)
            if (bwStatus.status === "unlocked") {
                bw_get_item(noteName)
            } else if (bwStatus.status === "locked") {
                console.log("Bitwarden is locked! Please unlock first.")
                console.info("You can execute the following command:\n > bw unlock")
            } else if (bwStatus.status === "unauthenticated") {
                console.log("Please login and unlock the bw cli then try again.")
            } else {
                console.log("Please check the bw cli tool is working well in your current terminal.")
            }

            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
        }
    });

}


function bw_lock_ssh_key_del() {

    exec('ssh-add -D', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            console.info("ssh-agent is not in working condition")
        } else {
            console.log(stdout)
            console.error(stderr)
        }
    });

    exec('bw lock', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            console.info("bw cli is not working well")
        } else {
            console.log(stdout)
            console.error(stderr)
        }
    });

}


let ssh_agent_sock = process.env.SSH_AUTH_SOCK;
if (fs.existsSync(ssh_agent_sock)) {
    console.log('SSH agent is running.');
    let noteName = process.argv[2]
    if (typeof noteName == 'string') {
        if (noteName.toLowerCase() === "lock") {
            bw_lock_ssh_key_del()
        } else {
            bw_check_status_go(noteName)
        }
    } else {
        console.log("Invalid note name argument")
        console.info("Valid argument is any note name containing private key or lock")
    }
} else {
    console.log('SSH agent not found. Please run ssh-agent process first.');
    console.info("You can try the following command to run ssh-agent:\n > eval $(ssh-agent -s)")
}

