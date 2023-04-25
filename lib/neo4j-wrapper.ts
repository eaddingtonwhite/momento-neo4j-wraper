import neo4j, { Record, ResultSummary } from "neo4j-driver";
import { CacheClient, CacheGet, CacheSet } from "@gomomento/sdk";

export function neo4jWrapper(momento: CacheClient, cacheName: string) {
  const originalNeo4jQueryRunFunction = neo4j.Session.prototype.run;

  // Override impl with our wrapper and try to load cached query result first
  // if query not cached then set value in cache after query completes.
  // @ts-ignore
  neo4j.Session.prototype.run = async function(query, p): Promise<Result> {
    const cacheKey = JSON.stringify({
      query: query,
      params: p
    });
    const getResponse = await momento.get(cacheName, cacheKey);
    if (getResponse instanceof CacheGet.Hit) {
      console.log("Got HIT returning cached value!")
      let returnList = Array<Record>();
      let records = JSON.parse((getResponse as CacheGet.Hit).valueString()) as Array<Record>;
      records.forEach(r => {
        returnList.push(new Record(r.keys, r["_fields"], r["_fieldLookup"]));
      });
      return {
        summary: new ResultSummary(<string>query, p, {}),
        records: returnList
      };

    } else if (getResponse instanceof CacheGet.Error) {
      // Fail open on cache error. Let DB query go through
      console.log(`Error: ${(getResponse as CacheGet.Error).message()}`);
    }

    const result = await originalNeo4jQueryRunFunction.call(this, query, p);

    if (result) {
      const setResponse = await momento.set(cacheName, cacheKey, JSON.stringify(result.records));
      if (setResponse instanceof CacheSet.Success) {
        console.log("Key stored successfully!");
      } else {
        console.log(`Error setting query result in cache key:${cacheKey} error:${setResponse.toString()}`);
      }
    }
    return result;
  };
}
