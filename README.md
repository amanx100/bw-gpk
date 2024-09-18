# bw-gpk

**Bitwarden Get Private Key (bw-gpk)** CLI tool is to fetch the clipboard directly or text file then create ssh config file and load the private keys to the ssh-agent securely.

## Installation

To install `bw-gpk`, use npm:

```
npm install -g bw-gpk
```

## Usage

1.  **Create Bitwarden Note:** Create a Bitwarden note with a friendly name. The note should contain SSH configuration and private key in the following format:

    ```
    Host hostname1
      Hostname <IP/FQDN>
      User <UserName>
    
    -----BEGIN OPENSSH PRIVATE KEY-----
    <PrivateKeyContents>
    -----END OPENSSH PRIVATE KEY-----
    
    # Comments are allowed
    
    Host hostname2
      Hostname <IP/FQDN>
      User <UserName>
    
    # At least one empty line between configurations
    
    Host hostname3
      Hostname <IP/FQDN>
      User <UserName>
    
    -----BEGIN OPENSSH PRIVATE KEY-----
    <PrivateKeyContents>
    -----END OPENSSH PRIVATE KEY-----
    
    ```
    
    NB: Please make sure that private keys are password less or unencrypted.
    
    >You can use the following command to remove the passphrase from your private key
    
    ```
    ssh-keygen -p -f <PrivateKeyFile>
    ```

2.  **Using `bw-gpk`:** After creating the Bitwarden note, use the `bw-gpk` tool to load private keys into the SSH agent. Run the following command:

    ```
    # fetch the content from Clipboard
    bw-gpk
    # or fetch the content from local file
    bw-gpk <bw-note-path>
    ```
    **Note:** For clipboard use, ensure that you have copied the note form Bitwarden.

3.  **List Hosts and IPs:** To see the Host and IPs/Hostnames in the ssh config file run the command:

    ```
    bw-gpk hosts
    ```

4.  **Clear keys and configs:** After using the tool, securely delete the private keys from ssh-agent and delete the ssh configs with:

    ```
    bw-gpk clear
    ```

## Example

Suppose you have a Bitwarden note named `my-ssh-keys` containing SSH configurations and private keys. To load these keys into the SSH agent, copy the node and then run:

  ```
  bw-gpk
  ```

To securely delete the configs and private keys, run:

  ```
  bw-gpk clear
  ```


## License

`bw-gpk` is licensed under the MIT License.


