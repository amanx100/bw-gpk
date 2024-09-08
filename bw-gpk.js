#!/usr/bin/env node

const os = require('os');
const {exec, execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');

//const userHomeDir = process.env.HOME;
const userHomeDir = os.homedir();
const directoryPath = userHomeDir + '/.bw-gpk';
const configFilePath = userHomeDir + '/.ssh/config'
const bw = path.resolve('node_modules/.bin/bw');

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

function process_bw_to_ssh(data) {
    //console.log(data.notes)
    let privateKeysString = data.notes

    const regex = /(-+)BEGIN(.*)KEY(-+)(\s.+)*END(.*)KEY(-+)/g;
    //const regexHost = /Host\s(.+)((\s).*(Hostname ).*\S)((\s).*(User ).*\S)/g;
    const regexHost = /Host (\S+)(\s^ +\S+ +\S+ *)+/g;
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


function bw_check_status_go_old(noteName) {
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

async function bw_check_status_go(noteName) {

    try {
        let stdout = await execSync(bw + ` status`)
        let bwStatus = JSON.parse(stdout)

        if (bwStatus.status === "unlocked") {
            bw_get_item(noteName)
        } else if (bwStatus.status === "locked") {
            console.log("Please unlock first.")
            console.info("You can execute the following command:\n > bw-gpk unlock")
        } else if (bwStatus.status === "unauthenticated") {
            console.log("Please login and unlock then try again.")
        } else {
            console.log("Something is going wrong...")
        }

    }catch (e) {
        console.error(e.message);
    }
}

async function bw_lock_ssh_key_del() {



    exec('ssh-add -D', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            console.info("ssh-agent is not in working condition")
        } else {
            console.log(stdout)
            console.error(stderr)
        }
    });


    try {
        const stdout = await execSync(bw + ` logout`).toString('utf8')
        console.log(stdout)
    }catch (e){
        //console.log(e.message)
    }

    // Delete the ssh config file when lock
    if (fs.existsSync(configFilePath)) {
        fs.unlink(configFilePath, (err) => {
            if (err) {
                console.error('Error deleting config file [' + configFilePath + ']:', err);
            } else {
                console.log('SSH config file deleted:', path.basename(configFilePath));
            }
        });
    } else {
        console.log('SSH Config File does not exist');
    }

}

async function bw_unlock(){

    try {
        const username = readlineSync.question('Enter email address: ');

        // Ask for password (masking the input)
        const password = readlineSync.question('Enter password: ', {
            hideEchoBack: true // Mask the input
        });

        const login_session = await execSync(bw + ` login ${username} ${password} --raw`).toString('utf8')

        // Regular expression to match the string
        const regex = /username or password is incorrect/i;  // 'i' flag for case-insensitive matching

        if (regex.test(login_session)) {
            console.log("Username or password is incorrect");
        } else {
            const unlocked_session = await execSync(bw + ` unlock ${password} --raw --session=${login_session}`).toString('utf8')
            if(regex.test(unlocked_session)){
                console.log("Username or password is incorrect");
            } else {
                console.log(unlocked_session)
            }
        }

    } catch (e) {
        //console.log(e.message)
    }
}

let ssh_agent_sock = process.env.SSH_AUTH_SOCK;
if (fs.existsSync(ssh_agent_sock)) {
    console.log('SSH agent is running.');
    let noteName = process.argv[2]
    if (typeof noteName == 'string') {
        if (noteName.toLowerCase() === "lock") {
            bw_lock_ssh_key_del()
        }
        else if (noteName == "unlock"){
            bw_unlock()
        }
        else {
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

