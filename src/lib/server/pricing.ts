import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import { env } from '$env/dynamic/private';

let pricingClient: PricingClient | null = null;

function getPricingClient(): PricingClient {
	if (!pricingClient) {
		pricingClient = new PricingClient({
			region: 'us-east-1', // Pricing API only works in us-east-1
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID || '',
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
			}
		});
	}
	return pricingClient;
}

// Cache pricing data for 24 hours
let pricingCache: { [key: string]: number } = {};
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get hourly rate for a specific instance type
 */
export async function getInstanceHourlyRate(
	instanceType: string,
	region: string = 'ap-southeast-1',
	operatingSystem: 'Linux' | 'Windows' = 'Linux'
): Promise<number> {
	const cacheKey = `${region}-${instanceType}-${operatingSystem}`;

	// Check cache
	if (pricingCache[cacheKey] && Date.now() - cacheTimestamp < CACHE_TTL) {
		return pricingCache[cacheKey];
	}

	const client = getPricingClient();

	try {
		const command = new GetProductsCommand({
			ServiceCode: 'AmazonEC2',
			Filters: [
				{
					Type: 'TERM_MATCH',
					Field: 'instanceType',
					Value: instanceType
				},
				{
					Type: 'TERM_MATCH',
					Field: 'location',
					Value: getRegionName(region)
				},
				{
					Type: 'TERM_MATCH',
					Field: 'operatingSystem',
					Value: operatingSystem
				},
				{
					Type: 'TERM_MATCH',
					Field: 'tenancy',
					Value: 'Shared'
				},
				{
					Type: 'TERM_MATCH',
					Field: 'capacitystatus',
					Value: 'Used'
				},
				{
					Type: 'TERM_MATCH',
					Field: 'preInstalledSw',
					Value: 'NA'
				}
			],
			MaxResults: 1
		});

		const response = await client.send(command);

		if (response.PriceList && response.PriceList.length > 0) {
			const priceData = JSON.parse(response.PriceList[0]);

			// Navigate through the complex pricing structure
			const onDemand = priceData.terms?.OnDemand;
			if (onDemand) {
				const termKey = Object.keys(onDemand)[0];
				const priceDimensions = onDemand[termKey]?.priceDimensions;

				if (priceDimensions) {
					const dimensionKey = Object.keys(priceDimensions)[0];
					const pricePerUnit = priceDimensions[dimensionKey]?.pricePerUnit?.USD;

					if (pricePerUnit) {
						const hourlyRate = parseFloat(pricePerUnit);

						// Cache the result
						pricingCache[cacheKey] = hourlyRate;
						cacheTimestamp = Date.now();

						return hourlyRate;
					}
				}
			}
		}

		console.warn(`[Pricing] No pricing found for ${instanceType} in ${region}`);
		return 0.05; // Fallback rate
	} catch (error) {
		console.error(`[Pricing] Error fetching price for ${instanceType}:`, error);
		return 0.05; // Fallback rate
	}
}

/**
 * Get hourly rates for multiple instance types at once
 */
export async function getInstanceHourlyRates(
	instances: Array<{ type: string; platform: 'Linux' | 'Windows' }>,
	region: string = 'ap-southeast-1'
): Promise<{ [key: string]: number }> {
	const rates: { [key: string]: number } = {};

	// Fetch rates in parallel
	await Promise.all(
		instances.map(async (instance) => {
			const cacheKey = `${instance.type}-${instance.platform}`;
			rates[cacheKey] = await getInstanceHourlyRate(instance.type, region, instance.platform);
		})
	);

	return rates;
}

/**
 * Convert AWS region code to region name used in Pricing API
 */
function getRegionName(regionCode: string): string {
	const regionMap: { [key: string]: string } = {
		'us-east-1': 'US East (N. Virginia)',
		'us-east-2': 'US East (Ohio)',
		'us-west-1': 'US West (N. California)',
		'us-west-2': 'US West (Oregon)',
		'ap-south-1': 'Asia Pacific (Mumbai)',
		'ap-northeast-1': 'Asia Pacific (Tokyo)',
		'ap-northeast-2': 'Asia Pacific (Seoul)',
		'ap-northeast-3': 'Asia Pacific (Osaka)',
		'ap-southeast-1': 'Asia Pacific (Singapore)',
		'ap-southeast-2': 'Asia Pacific (Sydney)',
		'ap-east-1': 'Asia Pacific (Hong Kong)',
		'ca-central-1': 'Canada (Central)',
		'eu-central-1': 'Europe (Frankfurt)',
		'eu-west-1': 'Europe (Ireland)',
		'eu-west-2': 'Europe (London)',
		'eu-west-3': 'Europe (Paris)',
		'eu-north-1': 'Europe (Stockholm)',
		'eu-south-1': 'Europe (Milan)',
		'me-south-1': 'Middle East (Bahrain)',
		'sa-east-1': 'South America (São Paulo)',
		'af-south-1': 'Africa (Cape Town)'
	};

	return regionMap[regionCode] || 'Asia Pacific (Singapore)';
}

/**
 * Clear the pricing cache (useful for testing or manual refresh)
 */
export function clearPricingCache(): void {
	pricingCache = {};
	cacheTimestamp = 0;
}
