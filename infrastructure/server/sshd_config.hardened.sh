# include any additional drop-in configs
Include /etc/ssh/sshd_config.d/*.conf # include extra drop-in settings

# port + protocol
Port <NEW_PORT>  # custom SSH port
Protocol 2 # only use SSHv2

# authentication
PermitRootLogin no                 # disable root login
PermitEmptyPasswords no            # disallow empty passwords
PasswordAuthentication no          # disable password auth
KbdInteractiveAuthentication no    # disable keyboard-interactive auth
ChallengeResponseAuthentication no # disable challenge/response auth
UsePAM no                          # disable PAM (enable only if needed)

# session limits
LoginGraceTime 30s      # drop slow/hanging connections
MaxAuthTries 3          # limit brute-force attempts
ClientAliveInterval 300 # send keepalive every 5 min
ClientAliveCountMax 0   # drop if no client response

# user restrictions
AllowUsers <YOUR_NEW_USERNAME> # restrict allowed login users
#AllowGroups sshusers                       # alternatively restrict by group

# port/X-forwarding
X11Forwarding no        # disable X11 forwarding
AllowTcpForwarding no   # disable port-forwarding
AllowAgentForwarding no # disable SSH agent forwarding
PermitTunnel no         # disable SSH tunneling

# messaging & env
PrintMotd no          # skip printing /etc/motd on login
Banner /etc/issue.net # legal banner/message
AcceptEnv LANG LC_*   # preserve locale env vars

# SFTP subsystem
Subsystem sftp internal-sftp # use internal SFTP server
#ChrootDirectory /home/%u                    # chroot SFTP users (optional)

# cryptographic settings (OpenSSH ≥7.4)
Ciphers aes256-gcm@openssh.com, # strong ciphers
chacha20-poly1305@openssh.com
KexAlgorithms curve25519-sha256, # strong key exchanges
curve25519-sha256@libssh.org
MACs hmac-sha2-512-etm@openssh.com, # strong MAC algorithms
hmac-sha2-256-etm@openssh.com

# host key algorithms
HostKey /etc/ssh/ssh_host_ed25519_key # ED25519 host key
HostKey /etc/ssh/ssh_host_rsa_key     # RSA host key
