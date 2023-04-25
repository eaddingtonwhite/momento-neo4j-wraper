import neo4j from "neo4j-driver";
import { neo4jWrapper } from "../lib/neo4j-wrapper";
import {
  CacheClient,
  Configurations,
  CredentialProvider,
} from "@gomomento/sdk";

// NEO4j Config
let dbUserName = process.env.NEO4J_USERNAME!;
let dbPassword = process.env.NEO4J_PASSWORD!;
let dbEndpoint = process.env.NEO4J_ENDPOINT!;

// Momento Config
let cacheName = process.env.CACHE_NAME!;
let defaultTTL = process.env.DEFAULT_TTL_SECONDS!;

describe("basic test", () => {
  it("happy path query with cache", async () => {
    neo4jWrapper(
      new CacheClient({
        configuration: Configurations.Laptop.v1(),
        credentialProvider: CredentialProvider.fromEnvironmentVariable({
          environmentVariableName: "MOMENTO_AUTH_TOKEN"
        }),
        defaultTtlSeconds: Number(defaultTTL)
      }),
      cacheName
    );
    const driver = neo4j.driver(dbEndpoint, neo4j.auth.basic(dbUserName, dbPassword));

    const s = driver.session({
      database: "movies"
    });

    const result = await s.run("MATCH (movie:Movie {title: $name}) RETURN movie", {
      "name": "Cloud Atlas"
    });
    result.records.forEach(record => {
      console.log("Movie tagline!: " + record.get("movie").properties["tagline"]);
    });
    await driver.close();
  });
});
