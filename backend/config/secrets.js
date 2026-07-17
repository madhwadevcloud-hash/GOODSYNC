const { SSMClient, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");

// Initialize the SSM client in your regional location
const ssmClient = new SSMClient({ region: "us-east-1" }); // Replace with your VPC region if different

async function loadSecrets() {
  // If we are running locally for development, we can fall back to .env
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  try {
    const command = new GetParametersByPathCommand({
      Path: "/goodsync/prod/",
      WithDecryption: true,
    });

    const response = await ssmClient.send(command);

    if (response.Parameters) {
      response.Parameters.forEach((param) => {
        // Extract the secret name (e.g., "/goodsync/prod/MONGODB_URI" -> "MONGODB_URI")
        const secretName = param.Name.split("/").pop();
        // Inject it directly into process.env so the rest of your app can use it normally
        process.env[secretName] = param.Value;
      });
      console.log("✅ Successfully loaded production secrets from AWS Parameter Store");
    }
  } catch (error) {
    console.error("❌ Failed to load secrets from AWS Parameter Store:", error);
    process.exit(1); // Exit if critical production secrets fail to load
  }
}

module.exports = { loadSecrets };