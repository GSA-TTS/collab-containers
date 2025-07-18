FROM quay.io/hedgedoc/hedgedoc:latest

# Copy the init.sh script into the container
COPY init.sh /app/init.sh

# Ensure the script has execution permissions
RUN chmod +x /app/init.sh

# Set the default command to use the init.sh script
CMD ["/bin/bash", "/app/init.sh", "node", "app.js"]
