import type { Question } from '../types';
import { qAmazon, qEcommerce, qRecommendations, qTicketBooking } from './commerce';
import { qApiGateway, qDistributedCache, qJobScheduler, qMessageBroker } from './infra';
import { qLibrary, qNotifications, qParkingLot, qRateLimiter } from './lld';
import { qLiveStreaming, qNetflix, qSpotify, qYouTube } from './media';
import { qAiChat, qDiscord, qGlobalNotifications, qWhatsApp } from './messaging';
import { qPayments, qTrading, qUber, qWallet } from './money';
import { qGaming, qLogging, qMetrics, qMultiRegion } from './ops';
import { qCounter, qFeedAtScale, qInstagram, qTwitter } from './social';
import { qCloudStorage, qDocs, qDrive, qSearchEngine } from './storage';
import { qFileUpload, qPastebin, qTodoApi, qUrlShortener } from './web';

/** Question walkthroughs, sorted by question number. Content lives in the themed files in this folder. */
export const questions: Question[] = [
  qUrlShortener,
  qPastebin,
  qFileUpload,
  qTodoApi,
  qParkingLot,
  qLibrary,
  qRateLimiter,
  qNotifications,
  qWhatsApp,
  qDiscord,
  qGlobalNotifications,
  qAiChat,
  qInstagram,
  qTwitter,
  qCounter,
  qFeedAtScale,
  qYouTube,
  qLiveStreaming,
  qNetflix,
  qSpotify,
  qEcommerce,
  qAmazon,
  qTicketBooking,
  qRecommendations,
  qUber,
  qPayments,
  qTrading,
  qWallet,
  qApiGateway,
  qDistributedCache,
  qMessageBroker,
  qJobScheduler,
  qSearchEngine,
  qDrive,
  qCloudStorage,
  qDocs,
  qLogging,
  qMetrics,
  qMultiRegion,
  qGaming,
].sort((a, b) => a.n - b.n);
