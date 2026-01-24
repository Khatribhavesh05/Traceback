'use client';

import { ItemReport, MatchResult, Claim } from '@/lib/types';
import MatchCard from './match-card';
import { AnimatePresence, motion } from 'framer-motion';

interface MatchResultsProps {
  matches: MatchResult[];
  lostItem: ItemReport;
  claims: Map<string, Claim>;
}

export default function MatchResults({ matches, lostItem, claims }: MatchResultsProps) {
  return (
    <div className="space-y-6">
       <AnimatePresence>
        {matches.map((match, index) => {
          const claim = claims.get(match.item.id!);

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <MatchCard match={match} lostItem={lostItem} claim={claim} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
