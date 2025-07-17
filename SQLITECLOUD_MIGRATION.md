# SQLiteCloud Migration Guide

This guide helps you migrate from local SQLite to SQLiteCloud.io for production deployments.

## What is SQLiteCloud?

SQLiteCloud.io is a fully-managed cloud service that provides SQLite databases with global scale, built-in replication, and enterprise-grade security. It's perfect for applications that need the simplicity of SQLite with cloud scalability.

## Benefits of SQLiteCloud

- ✅ **Managed Database**: No need to worry about database administration
- ✅ **High Availability**: Built-in replication and failover
- ✅ **Global Scale**: Edge locations worldwide for low latency
- ✅ **SQLite Compatible**: Use existing SQLite queries and syntax
- ✅ **Container Friendly**: Perfect for Docker deployments
- ✅ **Cost Effective**: Pay-as-you-scale pricing

## Migration Steps

### 1. Create a SQLiteCloud Account

1. Visit https://sqlitecloud.io/
2. Sign up for a free account
3. Create a new database cluster
4. Note your connection string (format: `sqlitecloud://user:password@host:port/database`)

### 2. Set Environment Variables

Add your SQLiteCloud connection string to your environment:

```bash
# .env file
SQLITECLOUD_URL=sqlitecloud://your-user:your-password@your-host:8860/your-database
```

For Docker Compose:
```bash
# .env file
SQLITECLOUD_URL=sqlitecloud://your-user:your-password@your-host:8860/your-database
```

### 3. Run Migration Script

If you have existing local data to migrate:

```bash
npm run migrate:sqlitecloud
```

This script will:
- Connect to both local SQLite and SQLiteCloud
- Create all tables in the cloud database
- Copy all data from local to cloud
- Verify the migration was successful

### 4. Test the Migration

Start your application with the SQLiteCloud URL set:

```bash
# Development
SQLITECLOUD_URL=your-connection-string npm run dev

# Docker Compose
docker compose up --build
```

### 5. Verify Everything Works

1. Check that your application starts without errors
2. Verify that data is being read from the cloud database
3. Test creating new records
4. Check the SQLiteCloud dashboard for activity

## Configuration

The application automatically detects the database to use:

1. **SQLiteCloud**: If `SQLITECLOUD_URL` is set
2. **Local SQLite**: If in development mode without SQLiteCloud URL
3. **Mock Database**: If in production without SQLiteCloud URL (fallback)

## Connection String Format

SQLiteCloud connection strings follow this format:

```
sqlitecloud://username:password@hostname:port/database?option1=value1&option2=value2
```

Example:
```
sqlitecloud://myuser:mypass@myhost.sqlitecloud.io:8860/mydatabase?timeout=10
```

## Environment-Specific Configuration

### Development
```bash
# Use local SQLite for development
# No SQLITECLOUD_URL needed
npm run dev
```

### Production with SQLiteCloud
```bash
SQLITECLOUD_URL=sqlitecloud://user:pass@host:port/db
NODE_ENV=production
npm start
```

### Docker Deployment
```yaml
# docker-compose.yml
environment:
  - SQLITECLOUD_URL=${SQLITECLOUD_URL}
  - NODE_ENV=production
```

## Troubleshooting

### Connection Issues

1. **Check connection string format**: Ensure it follows the correct format
2. **Verify credentials**: Test credentials in SQLiteCloud dashboard
3. **Check network access**: Ensure your deployment can reach SQLiteCloud
4. **Review firewall rules**: SQLiteCloud typically uses port 8860

### Migration Issues

1. **Check local database exists**: Ensure `database.sqlite` file exists
2. **Verify permissions**: Ensure read access to local database
3. **Check SQLiteCloud limits**: Review your plan's limits
4. **Monitor logs**: Check application logs for detailed error messages

### Performance Optimization

1. **Use connection pooling**: SQLiteCloud handles this automatically
2. **Enable compression**: Add `compress=true` to connection string
3. **Use nearest region**: Choose a SQLiteCloud region close to your deployment
4. **Monitor query performance**: Use SQLiteCloud analytics

## Security Best Practices

1. **Use strong passwords**: Generate secure passwords for database users
2. **Rotate credentials regularly**: Update connection strings periodically
3. **Limit database access**: Use specific users with minimal permissions
4. **Enable SSL/TLS**: SQLiteCloud uses encrypted connections by default
5. **Store secrets securely**: Use environment variables or secret managers

## Cost Optimization

1. **Monitor usage**: Track queries and storage in SQLiteCloud dashboard
2. **Optimize queries**: Use indexes and efficient query patterns
3. **Clean up old data**: Implement data retention policies
4. **Use appropriate plan**: Choose the right plan for your needs

## Support

- **SQLiteCloud Documentation**: https://docs.sqlitecloud.io/
- **SQLiteCloud Support**: Available through their dashboard
- **Application Issues**: Check logs and verify configuration

## Rollback Plan

If you need to rollback to local SQLite:

1. Remove `SQLITECLOUD_URL` from environment variables
2. Ensure `database.sqlite` file exists locally
3. Restart the application
4. The app will automatically use local SQLite

## Next Steps

After successful migration:

1. **Remove local database file** (optional): `rm database.sqlite`
2. **Update documentation**: Document the new cloud setup
3. **Monitor performance**: Watch SQLiteCloud metrics
4. **Set up backups**: Configure SQLiteCloud backup policies
5. **Scale as needed**: Upgrade plan when usage grows
