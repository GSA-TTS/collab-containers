FROM quay.io/hedgedoc/hedgedoc:1.10.8

# Copy the init.sh script into the container
COPY init.sh /app/init.sh

# Ensure the script has execution permissions and the data dir is writable by
# the unprivileged application user.
RUN chmod +x /app/init.sh && mkdir -p /data && chown hedgedoc:hedgedoc /data

# Run as the upstream unprivileged user.
USER hedgedoc

# Set the default command to use the init.sh script
CMD ["/bin/bash", "/app/init.sh", "node", "app.js"]
