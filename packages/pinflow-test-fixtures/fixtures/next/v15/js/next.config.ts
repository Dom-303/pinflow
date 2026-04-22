import type { NextConfig } from 'next';
import { withPinFlow } from '@pinflow/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPinFlow({
  debug: false,
  overlay: true,
})(nextConfig);
