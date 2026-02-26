export class MovieService {
  async getMovies() {
    const response = await fetch("http://localhost:3000/api/movies");
    return await response.json();
  }

  async getMovieById(id) {
    const movies = await this.getMovies();
    return movies.find((movie) => movie.id === id);
  }

  async getAllMovies() {
    const response = await fetch("http://localhost:3000/api/movies/all");
    return await response.json();
  }

  async getMoviesByIds(ids) {
    const movies = await this.getMovies();
    return movies.filter((movie) => ids.includes(movie.id));
  }

  async recommendForUser(userId) {
    const response = await fetch(
      `http://localhost:3000/api/recommend/user/${userId}`,
    );
    return await response.json();
  }

  async markAsWatched(userId, movieId, rating) {
    await fetch(`http://localhost:3000/api/users/${userId}/watch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        movieId,
        rating,
      }),
    });
  }
}
