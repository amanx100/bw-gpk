# bw-gpk

**Bitwarden Get Private Key (bw-gpk)** is a command-line tool designed to fetch private keys from Bitwarden notes and securely load them into the SSH agent. It also assists in creating a well-formatted SSH config file.

## Installation

To install `bw-gpk`, use npm:

```
npm install -g bw-gpk
``` 

Additionally, you need to have the Bitwarden CLI installed. You can install it with:


```
npm install -g @bitwarden/cli
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

2.  **Using `bw-gpk`:** After creating the Bitwarden note, use the `bw-gpk` tool to load private keys into the SSH agent. Run the following command:

    ```
    bw-gpk <bw-note-name>
    ```
    **Note:** Ensure that you're logged into Bitwarden CLI and have unlocked your vault before using `bw-gpk`.

3.  **Lock Bitwarden Vault:** After using the tool, securely delete and lock the Bitwarden vault with:

    ```
    bw-gpk lock
    ```

## Example

Suppose you have a Bitwarden note named `my-ssh-keys` containing SSH configurations and private keys. To load these keys into the SSH agent, run:

  ```
  bw-gpk my-ssh-keys
  ```

To securely delete and lock the Bitwarden vault after use, run:

  ```
  bw-gpk lock
  ```


## License

`bw-gpk` is licensed under the MIT License.


