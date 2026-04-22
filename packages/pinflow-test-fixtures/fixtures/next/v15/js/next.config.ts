import type { NextConfig } from 'next';
import { withDomscribe } from '@domscribe/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withDomscribe({
  debug: false,
  overlay: true,
})(nextConfig);
