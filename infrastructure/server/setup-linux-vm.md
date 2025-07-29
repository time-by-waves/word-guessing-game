# Overview

| Network            |                      |
| ------------------ | -------------------- |
| **Region**         |                      |
| **Host Node**      | <AUTO_GENERATED>     |
| **Permalink**      | <AUTO_GENERATED>     |
| **Public IP**      | <PUBLIC_IP_ADDRESS>  |
| **Remote User**    | root                 |
| **Remote Access**  | SSH                  |
| **LAN IP**         | <PRIVATE_IP_ADDRESS> |
| **Reverse DNS**    | <YOUR_CUSTOM_DOMAIN> |
| **Port Blocking**  | Enabled              |
| **Cloud Firewall** | Unconfigured         |

## TL;DR

- Connect to Server

  - `ssh root@<PUBLIC_IP_ADDRESS> -p 22`

- Update System

  - `apt-get update && sudo apt-get upgrade -y`

- Change Password

  - `passwd`

- Add new user

  - `adduser <YOUR_NEW_USERNAME>`

- Set User Permissions

  - `usermod -aG sudo <YOUR_NEW_USERNAME>`

- Check User Permissions

  - `sudo -l -U <YOUR_NEW_USERNAME>`

- Create Alias

  - `alias NAME='ssh <YOUR_NEW_USERNAME>@IPADDRESS'`

- Update All Apps

  - `sudo apt-get update`

- Change Directory to /etc/ssh

  - `cd /etc/ssh`

- Duplicate SSH Config file

  - `sudo cp sshd_config sshd_config.bak`

- Open SSH Config with nano

  - `sudo nano sshd_config`
    - _Disable Root_
      - `@PermitRootLogin change yes to no`
    - _Change Port_
      - `@Port change 22 to <NEW_PORT>`

- Restart SSH service

  - `sudo service ssh restart`

- Create RSA Key
- `ssh-keygen -t rsa -b 4096`
  - _Accept default location_
  - _Enter passphrase (optional)_

### Bash Profile Modifications

Show extended ssh-service status (200 lines, un-truncated)

`alias sshstat='sudo systemctl status ssh --lines=200 -l'`

Follow the sshd journal with 200 lines

`alias sshlog='sudo journalctl -u ssh --no-pager --lines=200'`

Show recent SSH service status on each login

```bash
  if [ -n "$SSH_CONNECTION" ]; then
    sudo systemctl status ssh \
      --lines=30 -l
  fi
```

## Update System

1. Update package index

   - Run the following command
     - `sudo apt-get update`

2. Upgrade installed packages

   - Run the following command
     - `sudo apt-get upgrade -y`

3. Change root password
   - Run the following command
     - `passwd`
   - Follow the prompts to set a strong password

## New User

1. Create new User

   - Run the following command
     - `adduser <YOUR_NEW_USERNAME>`

2. Follow prompts

   - Enter new password
   - Enter name
   - Skip the following fields by pressing Enter:
     - _Room number_
     - _Work phone_
     - _Home phone_
     - _Other_

3. Elevate new User

   - Run the following command
     - `usermod -aG sudo <YOUR_NEW_USERNAME>`

4. Check permissions show (ALL : ALL) ALL
   - Run the following command
     - `sudo -l -U <YOUR_NEW_USERNAME>`

## Secure SSH Basic

1. Backup SSH configuration

   - Run the following command
     - `sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak`

2. Modify SSH config file

   - Open the file
     - `sudo nano /etc/ssh/sshd_config`
   - Update/add the following directives:
     - `Port <NEW_PORT>` (choose between 1000 and 65000)
     - `PermitRootLogin no`
     - `PasswordAuthentication no`

3. Restart SSH service

   - Run the following command
     - `sudo systemctl restart ssh`

4. Verify SSH service status

   - Run the following command
     - `sudo systemctl status ssh`

5. Check SSH listening port
   - Run the following command
     - `sudo netstat -tulnp | grep ssh`

## Set RSA Keys

1. Generate an RSA key pair on your local machine

   - Run the following command (this names your key, adds a comment,
     and skips passphrase prompts):
     - `ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_wordguess -C "word-guessing-game key"`

2. Copy the public key to the server

   - Run the following command
     - `ssh-copy-id -i ~/.ssh/id_rsa_wordguess.pub -p <NEW_PORT> <YOUR_NEW_USERNAME>@<SERVER_IP>`

3. Prepare the server for key authentication
   - Connect to the server
     - `ssh -p <NEW_PORT> <YOUR_NEW_USERNAME>@<SERVER_IP>`
   - Create the .ssh directory
     - `mkdir -p ~/.ssh`
     - `chmod 700 ~/.ssh`
   - Create or update authorized_keys
     - `touch ~/.ssh/authorized_keys`
   - Paste your local `id_rsa_wordguess.pub` contents into the
     server's `authorized_keys` file
     - `nano ~/.ssh/authorized_keys`
   - Ensure the permissions are set correctly
     - `chmod 600 ~/.ssh/authorized_keys`

## Configure Firewall Rules

1. Allow SSH

   - Run the following commands
     - `sudo ufw allow <NEW_PORT>/tcp` # Only this line is needed if
       you changed the SSH port
     - `# sudo ufw allow OpenSSH` # This is redundant if using a
       custom port

2. **Allow** application ports

   - Run the following commands
     - `sudo ufw allow http` # For web traffic (port 80)
     - `sudo ufw allow https` # For secure web traffic (port 443)

3. Allow remote debugging from Bastion host IP

   - Run the following commands
     - `sudo ufw allow from <BASTION_HOST_IP> to any port 5432 proto tcp` #
       PostgreSQL
     - `sudo ufw allow from <BASTION_HOST_IP> to any port 6379 proto tcp` #
       Redis
     - `sudo ufw allow from <BASTION_HOST_IP> to any port 3000 proto tcp` #
       Node.js app

4. Enable UFW

   - Run the following command
     - `sudo ufw enable`

5. Check UFW status
   - Run the following command
     - `sudo ufw status verbose`

## Docker Security Configuration

1. Configure Docker to respect UFW rules

   - Create Docker daemon configuration
     - `sudo mkdir -p /etc/docker`
     - `sudo nano /etc/docker/daemon.json`
   - Add the following content to the file:
     ```json
     {
       "iptables": false
     }
     ```
   - Restart Docker service
     - `sudo systemctl restart docker`

2. Restrict container ports to localhost

   - Edit your docker-compose.yml file
     - For PostgreSQL:
       ```yaml
       services:
         postgres:
           # ...other config...
           ports:
             - '127.0.0.1:5432:5432' # Only expose to localhost
       ```
     - For Redis:
       ```yaml
       services:
         redis:
           # ...other config...
           ports:
             - '127.0.0.1:6379:6379' # Only expose to localhost
       ```

3. Create a Docker network with fixed subnet

   - Run the following command
     - `docker network create --subnet=172.20.0.0/24 word_guessing_network`
   - Update docker-compose.yml to use this network:
     ```yaml
     networks:
       default:
         external:
           name: word_guessing_network
     ```

4. Verify container network isolation
   - Run the following command after containers are started
     - `docker network inspect word_guessing_network`

## Optional Hardening

1. Remove comments and empty lines from SSH configuration

   - Run the following command to remove all lines that start with “#”
     - `sudo sed -i '/^#/d' /etc/ssh/sshd_config`
   - Run the following command to remove all empty lines
     - `sudo sed -i '/^$/d' /etc/ssh/sshd_config`
   - Replace the content with the values found in the
     ./sshd_config.hardening file of this repository

2. Install and configure Fail2Ban

   - Install Fail2Ban
     - `sudo apt-get install fail2ban -y`
   - Copy default jail configuration
     - `sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local`
   - Update SSH jail settings in `/etc/fail2ban/jail.local`
     - `port    = <NEW_PORT>`
     - `maxretry = 5`
     - `bantime  = 3600`
   - Restart Fail2Ban
     - `sudo systemctl restart fail2ban`

3. Apply kernel/network hardening

   - Add the following lines to `/etc/sysctl.conf`:
     - `net.ipv4.ip_forward = 0` # Disable IPv4 packet forwarding
     - `net.ipv4.conf.all.send_redirects = 0` # Disable sending ICMP
       redirects (all interfaces)
     - `net.ipv4.conf.default.send_redirects = 0` # Disable sending
       ICMP redirects (default)
     - `net.ipv6.conf.all.disable_ipv6 = 1` # Disable IPv6
   - Reload sysctl settings
     - `sudo sysctl -p`

4. Disable unused filesystems

   **Purpose:** Disabling filesystems that your server does not use
   reduces the attack surface. If an attacker tries to exploit a
   vulnerability in a filesystem driver that is not loaded, the attack
   will fail. This is a common hardening step for Linux servers.

   **How it works:** The `install <filesystem> /bin/true` directive in
   a file under `/etc/modprobe.d/` tells the Linux kernel to run
   `/bin/true` (which does nothing and exits successfully) whenever
   there is an attempt to load the specified filesystem module. This
   effectively prevents the module from being loaded, even if
   requested by a user or process.

   **Commands in this step:** Each `echo ... | sudo tee ...` command
   creates a configuration file that blacklists a specific filesystem
   module. For example:

   ```bash
   echo "install cramfs /bin/true" | sudo tee /etc/modprobe.d/disable_cramfs.conf
   ```

   - This prevents the `cramfs` filesystem module from being loaded.

   **Filesystems commonly disabled:**

   - `cramfs` (Compressed ROM File System)
   - `freevxfs` (Veritas VxFS)
   - `jffs2` (Journaling Flash File System v2)
   - `hfs` (Hierarchical File System, used by old Macs)
   - `hfsplus` (HFS+, used by newer Macs)
   <!-- - `squashfs` (compressed read-only filesystem) -->
   - `udf` (Universal Disk Format, used on DVDs)

   **When to skip:** If you know your application or server needs to
   mount one of these filesystems (for example, you use `squashfs` for
   snaps or `udf` for DVDs), do **not** disable that filesystem.

   **Summary:** This step is a defense-in-depth measure. It is safe
   for most web servers and VMs, but always review which filesystems
   your system actually needs before disabling.

   - Create a blacklist file for each filesystem

   ```bash
   echo "install cramfs /bin/true"   | sudo tee /etc/modprobe.d/disable_cramfs.conf
   echo "install freevxfs /bin/true" | sudo tee /etc/modprobe.d/disable_freevxfs.conf
   echo "install jffs2 /bin/true"    | sudo tee /etc/modprobe.d/disable_jffs2.conf
   echo "install hfs /bin/true"      | sudo tee /etc/modprobe.d/disable_hfs.conf
   echo "install hfsplus /bin/true"  | sudo tee /etc/modprobe.d/disable_hfsplus.conf
    # the squashfs filesystem might be used in our repo
    # echo "install squashfs /bin/true" | sudo tee /etc/modprobe.d/disable_squashfs.conf
   echo "install udf /bin/true"      | sudo tee /etc/modprobe.d/disable_udf.conf
   ```

5. Configure login banners

   - Edit `/etc/issue.net` and add your legal notice or warning
   - Ensure SSH banner is enabled:
     - Verify `Banner /etc/issue.net` in `/etc/ssh/sshd_config`
   - Restart SSH service
     - `sudo systemctl restart ssh`

6. Automatic SSH-status on user login

   - Grant password-less status check (as root)
     1. Edit sudoers
        - `sudo visudo`
        - Add line:
          `<YOUR_NEW_USERNAME> ALL=(root) NOPASSWD: /bin/systemctl status ssh --lines=30 -l`
   - Append to the user’s `~/.bashrc` or `~/.bash_profile`:

     ```bash
     # show recent SSH service status on each login
     if [ -n "$SSH_CONNECTION" ]; then
       sudo systemctl status ssh --lines=30 -l
     fi
     ```

   - This configuration allows the SSH status to display automatically
     on login **without** prompting for your password, as long as the
     sudoers entry is correct and specific to the command above.

## Ongoing Monitoring & Maintenance

1. Set up automatic security updates

   - Install unattended-upgrades
     - `sudo apt-get install unattended-upgrades -y`
   - Enable automatic updates
     - `sudo dpkg-reconfigure --priority=low unattended-upgrades`

2. Monitor system logs regularly

   - Check logs for unusual activity
     - `sudo tail -f /var/log/auth.log`
     - `sudo tail -f /var/log/syslog`

3. Monitor resource usage

   - Use these tools to check system health
     - `htop` # Install with: sudo apt-get install htop
     - `df -h` # Check disk usage
     - `free -m` # Check memory usage

4. Check for rootkits and malware

   - Install and run rkhunter
     - `sudo apt-get install rkhunter -y`
     - `sudo rkhunter --check`

5. Regularly review user accounts and permissions

   - List users
     - `cut -d: -f1 /etc/passwd`
   - Check sudoers
     - `sudo cat /etc/sudoers`
     - `sudo ls /etc/sudoers.d/`

6. Backup your configuration and data

   - Create automated backup script

     ```bash
     #!/bin/bash
     # Example backup script
     BACKUP_DIR="/backup/$(date +%Y-%m-%d)"
     mkdir -p $BACKUP_DIR

     # Backup important configs
     sudo cp -r /etc/ssh $BACKUP_DIR/
     sudo cp -r /etc/fail2ban $BACKUP_DIR/

     # Backup docker volumes (if applicable)
     docker run --rm -v word_guessing_data:/source \
       -v $BACKUP_DIR:/backup alpine \
       tar czf /backup/data.tar.gz -C /source .

     # Set permissions
     sudo chown -R $(whoami):$(whoami) $BACKUP_DIR
     ```

## Troubleshooting

### SSH Service

1. Restart SSH service

   - `/etc/init.d/ssh restart`

2. Check service status

   - `sudo systemctl status ssh`

3. Restart via systemctl

   - `sudo systemctl restart ssh`

4. View recent SSH logs

   - `sudo journalctl -u ssh -n 50`

5. Verify SSH daemon process

   - `pgrep -fl sshd`

6. Test SSH configuration syntax

   - `sudo sshd -t`

7. Check SSH config errors

   - `sudo sshd -T | grep -E 'port|permitrootlogin'`

8. Inspect SSH config file
   - `sudo sed -n '1,200p' /etc/ssh/sshd_config`

### SSH Configuration

1. Test config file for errors

   - `sudo sshd -t`

2. Verify Port directive

   - `grep '^Port ' /etc/ssh/sshd_config`

3. Verify PermitRootLogin directive

   - `grep '^PermitRootLogin ' /etc/ssh/sshd_config`

4. Check authorized_keys permissions

   - `ls -ld ~/.ssh ~/.ssh/authorized_keys`

5. Verify .ssh directory permissions

   - `stat -c '%a %n' ~/.ssh ~/.ssh/authorized_keys`

6. Review authorized_keys entries

   - `sed -n '1,100p' ~/.ssh/authorized_keys`

7. Confirm correct file ownership

   - `ls -lA ~ | grep .ssh`

8. Check SELinux/AppArmor status (if applicable)
   - `sudo aa-status`
   - `sudo sestatus`

### SSH Listening Ports

1. Check with netstat

   - `sudo netstat -tulnp | grep ssh`

2. Check with ss

   - `sudo ss -tlnp | grep ssh`

3. List open ports with lsof

   - `sudo lsof -i TCP:22`

4. Verify IPv6 port listening
   - `sudo netstat -tulnp | grep ':22 '`

### Connectivity Tests

1. Ping the server

   - `ping -c 4 <PUBLIC_IP_ADDRESS>`

2. Test SSH connection verbose

   - `ssh -vvv -p <NEW_PORT> <USER>@<SERVER_IP>`

3. Telnet to SSH port

   - `telnet <PUBLIC_IP_ADDRESS> <NEW_PORT>`

4. Scan port with nmap

   - `nmap -Pn -p <NEW_PORT> <PUBLIC_IP_ADDRESS>`

5. Traceroute to server
   - `traceroute <PUBLIC_IP_ADDRESS>`

### System Logs

1. View auth log

   - `sudo tail -n 50 /var/log/auth.log`

2. View syslog

   - `sudo tail -n 50 /var/log/syslog`

3. Check dmesg for SSH errors

   - `dmesg | grep -i ssh`

4. Inspect kernel log
   - `sudo journalctl -k | grep ssh`

### Disk and Memory

1. Check disk usage

   - `df -h`

2. Check memory usage

   - `free -m`

3. Check top processes

   - `top -bn1 | head -n 20`

4. Identify high load
   - `uptime`

### User and Sudo

1. Verify user identity

   - `id <YOUR_NEW_USERNAME>`

2. Check sudo privileges

   - `sudo -l -U <YOUR_NEW_USERNAME>`

3. Validate sudoers syntax

   - `sudo visudo -c`

4. Check sudo group membership
   - `getent group sudo`

### DNS and Reverse Lookup

1. DNS resolution

   - `dig dev.WordGuessingGame.com +short`

2. Reverse DNS lookup

   - `dig -x <PUBLIC_IP_ADDRESS> +short`

3. Check /etc/hosts entries
   - `grep '<PRIVATE_IP_ADDRESS>' /etc/hosts`

### Firewall (UFW)

1. Check UFW status

   - `sudo ufw status verbose`

2. Reload UFW rules

   - `sudo ufw reload`

3. Enable UFW logging

   - `sudo ufw logging on`

4. Delete a rule

   - `sudo ufw delete allow <PORT_NUMBER>`

5. Reset UFW to defaults

   - `sudo ufw reset`

6. Disable UFW

   - `sudo ufw disable`

7. Allow specific port

   - `sudo ufw allow <PORT_NUMBER>`

8. Deny specific port

   - `sudo ufw deny <PORT_NUMBER>`

9. Check raw iptables rules

   - `sudo iptables -L -n`

10. List IPv6 firewall rules
    - `sudo ip6tables -L -n`
