# Stage: Lightweight Alpine Nginx image for MiniStore Frontend
FROM nginx:alpine

# Remove default static pages
RUN rm -rf /usr/share/nginx/html/*

# Copy HTML, CSS, and Vanilla JavaScript assets
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Copy custom Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
