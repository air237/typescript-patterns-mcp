/**
 * Component — the common interface uniting leaves and composites so that a
 * client can treat a single Product and a Box of products the same way.
 */
export interface Component {
  cost(): number;
}
