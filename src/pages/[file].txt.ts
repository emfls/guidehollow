import { site } from '../config';
export function getStaticPaths() { return site.ads.publisherId ? [{params:{file:'ads'}}] : []; }
export function GET() { return new Response(`google.com, ${site.ads.publisherId.replace('ca-','')}, DIRECT, f08c47fec0942fa0\n`,{headers:{'Content-Type':'text/plain;charset=utf-8'}}); }
