# Alpine variant: no Debian OS packages, which removes the OS-level findings of the Debian images.
FROM quay.io/hedgedoc/hedgedoc:1.12.0-alpine

# Copy the init.sh script into the container
COPY init.sh /app/init.sh

# Ensure the script is executable and the data dir is writable by the unprivileged user.
RUN chmod +x /app/init.sh && mkdir -p /data && chown hedgedoc:hedgedoc /data

# Run as the upstream unprivileged user.
USER hedgedoc

# Set the default command to use the init.sh script
CMD ["/bin/sh", "/app/init.sh", "node", "app.js"]
